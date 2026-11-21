import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { CAMPOS, type Campo, type Seleccion } from './seleccion-tablero';
import type { Opciones } from './filtros-comun';
import { alias } from './facetas';
import { motorActivo } from './claves';
import { rolesDe } from './datos';

const columnas = { estado: 'r.estado_clave', municipio: 'r.municipio_clave', programa: 'r.iniciativa_id', servicio: 'r.servicio' };
const nombres = { estado: 'r.estado', municipio: 'm.municipio', programa: 'i.nombre', servicio: 'r.servicio' };
const fuente = `FROM v_registros_ef r JOIN iniciativas i ON i.id=r.iniciativa_id
  LEFT JOIN municipios m ON m.clave=r.municipio_clave
  LEFT JOIN roles_de_persona rol ON rol.clave=r.rol_persona`;

function seleccion(f: Seleccion, excepto?: Campo) {
  const where = ["r.contado=1", "i.clase <> 'fuente_publica'"];
  const args: string[] = [];
  for (const d of CAMPOS) {
    if (d === excepto || !f[d].length) continue;
    where.push(`${columnas[d]} IN (SELECT value FROM json_each(?))`);
    args.push(JSON.stringify(f[d]));
  }
  if (f.desde) { where.push('r.periodo >= ?'); args.push(f.desde); }
  if (f.hasta) { where.push("r.periodo <> '' AND r.periodo <= ?"); args.push(f.hasta); }
  return { sql: `${fuente} WHERE ${where.join(' AND ')}`, args };
}

export type Punto = { clave: string; nombre: string; n: number };
export type Lugar = Punto & { estado: string; entidad: string };

export async function leerTablero(f: Seleccion) {
  const selma = motorActivo() === 'selma';
  const ruta = selma ? process.env.EIRA_TABLERO_DB : process.env.IMPACTO_DB || resolve('..', 'data', 'impacto.sqlite');
  if (!ruta) throw new Error('Falta EIRA_TABLERO_DB para el tablero de Selma');
  const soloProgramas = !f.estado.length && !f.municipio.length && !f.servicio.length && !f.desde && !f.hasta;
  const roles = selma && soloProgramas ? await rolesDe(f.programa) : null;
  const db = new DatabaseSync(ruta, { readOnly: true });
  try {
    // Una transacción de lectura: ni un archivo nuevo ni una decisión de par
    // pueden cambiar la población entre el titular, su desglose y las facetas.
    db.exec('BEGIN');
    const { sql, args } = seleccion(f);
    const cte = `WITH filas AS (SELECT r.*, m.municipio AS oficial, rol.cuenta_como_impactada AS impacto ${sql}),
      positivas AS (SELECT * FROM filas WHERE cantidad>0 AND persona_ef IS NOT NULL),
      por_programa AS (SELECT iniciativa_id,
        COUNT(DISTINCT CASE WHEN impacto=1 THEN persona_ef END) AS personas,
        COUNT(DISTINCT CASE WHEN rol_persona='donante' THEN persona_ef END) AS donantes
        FROM positivas GROUP BY iniciativa_id),
      edades AS (SELECT e.edad FROM v_edad e WHERE e.persona IN
        (SELECT persona_ef FROM positivas WHERE impacto=1) AND e.edad IS NOT NULL) `;
    const filas = <T,>(consulta: string) => db.prepare(cte + consulta).all(...args) as T[];
    const [kpi] = filas<{ personas: number; edad: number | null; municipios: number; donantes: number }>(`SELECT
      (SELECT COALESCE(SUM(personas),0) FROM por_programa) personas,
      (SELECT ROUND(AVG(edad),1) FROM edades) edad,
      (SELECT COUNT(DISTINCT NULLIF(municipio_clave,'')) FROM filas) municipios,
      (SELECT COALESCE(SUM(donantes),0) FROM por_programa) donantes`);
    const lugares = filas<Lugar>(`SELECT municipio_clave clave, COALESCE(oficial,municipio) nombre,
      estado_clave estado, estado entidad, COUNT(*) n FROM filas WHERE municipio_clave <> ''
      GROUP BY estado_clave,municipio_clave ORDER BY n DESC,nombre`);
    const meses = filas<Punto>(`SELECT periodo clave, periodo nombre, COUNT(*) n FROM filas
      WHERE periodo <> '' GROUP BY periodo ORDER BY periodo`);
    const servicios = filas<Punto>(`SELECT servicio clave, COALESCE(NULLIF(servicio,''),'Sin especificar') nombre,
      COUNT(*) n FROM filas GROUP BY servicio ORDER BY n DESC,nombre`);
    const edades = filas<Punto>(`SELECT CASE WHEN edad<18 THEN '0–17' WHEN edad<30 THEN '18–29'
      WHEN edad<45 THEN '30–44' WHEN edad<60 THEN '45–59' ELSE '60 o más' END nombre,
      MIN(edad) clave, COUNT(*) n FROM edades GROUP BY nombre ORDER BY MIN(edad)`);
    const opciones: Opciones = { estado: [], municipio: [], programa: [], servicio: [], periodo: [] };
    for (const d of CAMPOS) {
      const s = seleccion(f, d);
      const valores = db.prepare(`SELECT ${columnas[d]} valor, COALESCE(${nombres[d]},${columnas[d]}) texto,
        COUNT(*) cuenta ${s.sql} AND ${columnas[d]}<>'' GROUP BY ${columnas[d]} ORDER BY texto`).all(...s.args);
      // Preserve the name and removal affordance even when another filter excludes it.
      const elegidos = f[d].length ? db.prepare(`SELECT DISTINCT ${columnas[d]} valor, COALESCE(${nombres[d]},${columnas[d]}) texto
        ${fuente} WHERE ${columnas[d]} IN (SELECT value FROM json_each(?))`).all(JSON.stringify(f[d])) : [];
      opciones[d] = [...valores, ...elegidos.filter(o => !valores.some(v => v.valor === o.valor))].map(o => ({
        valor: String(o.valor), texto: String(o.texto), cuenta: Number(o.cuenta || 0),
        alias: d === 'municipio' ? alias[String(o.valor)] : undefined, unidad: 'registros',
      }));
    }
    const calidad = db.prepare(`SELECT (SELECT COUNT(*) FROM v_pares_pendientes) pares,
      (SELECT COUNT(*) ${fuente} WHERE r.contado=1 AND i.clase <> 'fuente_publica'
      AND r.persona_ef IS NULL) sinId, (SELECT MAX(fecha_corte) FROM fuentes) corte`).get() as
      { pares: number; sinId: number; corte: string | null };
    return { ...kpi, ...(roles && { personas: roles.totalImpactadas, donantes: roles.totalDonantes }),
      ...calidad, lugares, meses, servicios, edades, opciones,
      conDonantes: !f.programa.length || f.programa.includes('melenas-en-movimiento') };
  } finally { db.close(); }
}
