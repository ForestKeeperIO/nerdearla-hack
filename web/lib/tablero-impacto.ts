import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { CAMPOS, periodoAnterior, type Campo, type Seleccion } from './seleccion-tablero';
import type { Opciones } from './filtros-comun';
import { alias } from './facetas';

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
export type Cifras = { personas: number; edad: number | null; municipios: number; donantes: number };
export type Carga = { nombre: string; programa: string; fecha: string; estrellas: number | null; puntaje: number | null };
export type Servicio = Punto & { unidad: string; cantidad: number };

const abrir = () => new DatabaseSync(process.env.IMPACTO_DB || resolve('..', 'data', 'impacto.sqlite'), { readOnly: true });

// Este marcador también se lee dentro de la transacción de la pantalla:
// una carga confirmada durante el render no queda entre dos suscripciones.
function revisionDe(db: DatabaseSync) {
  const r = db.prepare(`SELECT (SELECT COUNT(*) FROM fuentes) fuentes,
    (SELECT COALESCE(MAX(id),0) FROM bitacora) cambio,
    (SELECT COUNT(*) FROM v_pares_pendientes) pendientes`).get()!;
  return `${r.fuentes}:${r.cambio}:${r.pendientes}`;
}

export function leerRevision() {
  const db = abrir();
  try { return revisionDe(db); } finally { db.close(); }
}

export function leerTablero(f: Seleccion) {
  const db = abrir();
  try {
    // Una transacción de lectura: ni un archivo nuevo ni una decisión de par
    // pueden cambiar la población entre el titular, su desglose y las facetas.
    db.exec('BEGIN');
    const { sql, args } = seleccion(f);
    const base = (origen: string) => `WITH filas AS (SELECT r.*, m.municipio AS oficial, rol.cuenta_como_impactada AS impacto ${origen}),
      positivas AS (SELECT * FROM filas WHERE cantidad>0 AND persona_ef IS NOT NULL),
      por_programa AS (SELECT iniciativa_id,
        COUNT(DISTINCT CASE WHEN impacto=1 THEN persona_ef END) AS personas,
        COUNT(DISTINCT CASE WHEN rol_persona='donante' THEN persona_ef END) AS donantes
        FROM positivas GROUP BY iniciativa_id),
      edades AS (SELECT e.edad FROM v_edad e WHERE e.persona IN
        (SELECT persona_ef FROM positivas WHERE impacto=1) AND e.edad IS NOT NULL) `;
    // node:sqlite devuelve filas sin prototipo; React Flight requiere objetos planos.
    const filas = <T,>(consulta: string) => db.prepare(base(sql) + consulta).all(...args).map(row => ({ ...row })) as T[];
    const indicadores = `SELECT (SELECT COUNT(*) FROM filas) registros,
      (SELECT COALESCE(SUM(personas),0) FROM por_programa) personas,
      (SELECT ROUND(AVG(edad),1) FROM edades) edad,
      (SELECT COUNT(DISTINCT NULLIF(municipio_clave,'')) FROM filas) municipios,
      (SELECT COALESCE(SUM(donantes),0) FROM por_programa) donantes`;
    const [kpi] = filas<Cifras>(indicadores);
    const anterior = periodoAnterior(f);
    const previo = anterior ? seleccion(anterior) : null;
    const comparacion = previo && db.prepare(base(previo.sql)+indicadores).get(...previo.args) as (Cifras & { registros: number }) | null;
    const lugares = filas<Lugar>(`SELECT municipio_clave clave, COALESCE(oficial,municipio) nombre,
      estado_clave estado, estado entidad, COUNT(*) n FROM filas WHERE municipio_clave <> ''
      GROUP BY estado_clave,municipio_clave ORDER BY n DESC,nombre`);
    const meses = filas<Punto>(`SELECT periodo clave, periodo nombre, COUNT(*) n FROM filas
      WHERE periodo <> '' GROUP BY periodo ORDER BY periodo`);
    const servicios = filas<Punto>(`SELECT servicio clave, COALESCE(NULLIF(servicio,''),'Sin especificar') nombre,
      COUNT(*) n FROM filas GROUP BY servicio ORDER BY n DESC,nombre`);
    const unidades = filas<Servicio>(`SELECT tipo_registro || ':' || COALESCE(servicio,'') clave,
      COALESCE(NULLIF(servicio,''),'Sin especificar') nombre, t.plural unidad, COUNT(*) n, SUM(cantidad) cantidad
      FROM filas JOIN tipos_de_registro t ON t.clave=tipo_registro GROUP BY tipo_registro,servicio ORDER BY unidad,cantidad DESC,nombre`);
    const cargas = filas<Carga>(`SELECT f.nombre, i.nombre programa, f.cargada_en fecha, f.estrellas, f.puntaje
      FROM fuentes f JOIN iniciativas i ON i.id=f.iniciativa_id WHERE f.id IN (SELECT fuente_id FROM filas)
      ORDER BY f.cargada_en DESC,f.id LIMIT 4`);
    const edades = filas<Punto>(`SELECT CASE WHEN edad<18 THEN '0–17' WHEN edad<30 THEN '18–29'
      WHEN edad<45 THEN '30–44' WHEN edad<60 THEN '45–59' ELSE '60 o más' END nombre,
      MIN(edad) clave, COUNT(*) n FROM edades GROUP BY nombre ORDER BY MIN(edad)`);
    const opciones: Opciones = { estado: [], municipio: [], programa: [], servicio: [], periodo: [] };
    for (const d of CAMPOS) {
      const s = seleccion(f, d);
      const valores = db.prepare(`SELECT ${columnas[d]} valor, COALESCE(${nombres[d]},${columnas[d]}) texto,
        COUNT(*) cuenta ${s.sql} AND ${columnas[d]}<>'' GROUP BY ${columnas[d]} ORDER BY texto`).all(...s.args);
      // Un valor excluido por otro filtro conserva el nombre y se puede quitar.
      const elegidos = f[d].length ? db.prepare(`SELECT DISTINCT ${columnas[d]} valor, COALESCE(${nombres[d]},${columnas[d]}) texto
        ${fuente} WHERE ${columnas[d]} IN (SELECT value FROM json_each(?))`).all(JSON.stringify(f[d])) : [];
      opciones[d] = [...valores, ...elegidos.filter(o => !valores.some(v => v.valor === o.valor))].map(o => ({
        valor: String(o.valor), texto: String(o.texto), cuenta: Number(o.cuenta || 0),
        alias: d === 'municipio' ? alias[String(o.valor)] : undefined, unidad: 'registros',
      }));
    }
    const calidad = db.prepare(`SELECT (SELECT COUNT(*) FROM v_pares_pendientes) pares,
      (SELECT COUNT(*) FROM pares_persona WHERE estado IN ('misma','distinta')) decididos,
      (SELECT COUNT(*) ${fuente} WHERE r.contado=1 AND i.clase <> 'fuente_publica'
      AND r.persona_ef IS NULL) sinId, (SELECT MAX(fecha_corte) FROM fuentes) corte`).get() as
      { pares: number; decididos: number; sinId: number; corte: string | null };
    return { ...kpi, ...calidad, revision: revisionDe(db), lugares, meses, servicios, unidades, cargas, edades, opciones,
      comparacion: comparacion?.registros ? comparacion : null, anterior,
      conDonantes: !f.programa.length || f.programa.includes('melenas-en-movimiento') };
  } finally { db.close(); }
}
