// Verifica invariantes del contrato sobre la base actual e imprime una tabla
// OK / FALLA. Sale con código 1 si algo falla.
import type { Valkey } from 'iovalkey';
import { conectar } from './conexion';
import {
  contrato, cnt, fuente, fuentes, patronTodo, perPrograma, perTodas, valores,
} from './claves';
import { NOMBRES_FICTICIOS } from './semilla';

export interface Resultado {
  ok: boolean;
  nombre: string;
  detalle: string;
}

const sumaHash = async (v: Valkey, clave: string) => {
  const vals = await v.hvals(clave);
  return vals.reduce((a, x) => a + Number(x), 0);
};

// Extrae todo el texto de una clave según su tipo, para buscar nombres.
async function textoDe(v: Valkey, clave: string): Promise<string> {
  const tipo = await v.type(clave);
  switch (tipo) {
    case 'string': return (await v.get(clave)) ?? '';
    case 'hash': return Object.entries(await v.hgetall(clave)).flat().join(' ');
    case 'list': return (await v.lrange(clave, 0, -1)).join(' ');
    case 'set': return (await v.smembers(clave)).join(' ');
    case 'zset': return (await v.zrange(clave, 0, -1)).join(' ');
    case 'stream': {
      const entradas = await v.xrange(clave, '-', '+');
      return entradas.flatMap(([, campos]) => campos).join(' ');
    }
    default: return '';
  }
}

export async function verificar(v: Valkey): Promise<Resultado[]> {
  const r: Resultado[] = [];
  const marca = (nombre: string, ok: boolean, detalle: string) =>
    r.push({ ok, nombre, detalle });

  // 1. La versión del contrato está declarada.
  const c = await v.get(contrato());
  marca('eira:contrato existe y vale 1', c === '1', `valor=${c}`);

  // 2. Los conteos cuadran con la semilla: 160 atenciones, 80 participaciones.
  const atencion = await sumaHash(v, cnt('atencion'));
  const participacion = await sumaHash(v, cnt('participacion'));
  marca('suma de eira:cnt:atencion = 160', atencion === 160, `suma=${atencion}`);
  marca('suma de eira:cnt:participacion = 80', participacion === 80, `suma=${participacion}`);

  // 3. Toda persona de cada programa está en el conjunto global.
  const todas = new Set(await v.smembers(perTodas()));
  const programas = await v.smembers(valores('programa'));
  for (const p of programas) {
    const miembros = await v.smembers(perPrograma(p));
    const fuera = miembros.filter((m) => !todas.has(m));
    marca(`per:programa:${p} ⊆ per:todas`, fuera.length === 0,
      `${miembros.length} miembros, ${fuera.length} fuera`);
  }

  // 4. El cruce exacto entre los dos primeros programas es 15 personas.
  const cruce = await v.sintercard(2, perPrograma('Tamizaje Rosa'), perPrograma('Salud que Florece'));
  marca('SINTERCARD Tamizaje Rosa ∩ Salud que Florece = 15', cruce === 15, `cruce=${cruce}`);

  // 5. Ningún valor contiene un nombre completo ficticio.
  let cursor = '0';
  const clavesTodas: string[] = [];
  do {
    const [sig, ks] = await v.scan(cursor, 'MATCH', patronTodo(), 'COUNT', 500);
    cursor = sig;
    clavesTodas.push(...ks);
  } while (cursor !== '0');
  let conNombre: string[] = [];
  for (const k of clavesTodas) {
    const texto = await textoDe(v, k);
    for (const n of NOMBRES_FICTICIOS) {
      if (texto.includes(n)) conNombre.push(`${k} → ${n}`);
    }
  }
  marca('ningún valor contiene nombres completos ficticios', conNombre.length === 0,
    conNombre.length ? conNombre.join('; ') : `${clavesTodas.length} claves revisadas`);

  // 6. Cada fuente del índice tiene su hash.
  const ids = await v.zrange(fuentes(), 0, -1);
  let sinHash: string[] = [];
  for (const id of ids) {
    if (!(await v.exists(fuente(id)))) sinHash.push(id);
  }
  marca('cada fuente de eira:fuentes tiene su hash', sinHash.length === 0,
    sinHash.length ? `sin hash: ${sinHash.join(', ')}` : `${ids.length} fuentes`);

  return r;
}

export function imprimir(r: Resultado[]) {
  const ancho = Math.max(...r.map((x) => x.nombre.length));
  for (const x of r) {
    console.log(`${x.ok ? 'OK   ' : 'FALLA'}  ${x.nombre.padEnd(ancho)}  ${x.detalle}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const v = conectar();
  const r = await verificar(v);
  v.disconnect();
  imprimir(r);
  const mal = r.filter((x) => !x.ok).length;
  console.log(mal ? `\n${mal} invariantes fallaron.` : '\nTodo el contrato en orden.');
  process.exit(mal ? 1 : 0);
}
