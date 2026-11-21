import { catalogo } from './catalogo';
import { valkey } from './valkey';

const tipos = ['set', 'hash', 'stream', 'string', 'list', 'zset'] as const;
const flujos = ['eira:trabajos', 'eira:decisiones'] as const;
const familias = new Set('per cnt fuente trabajo archivo anom omitidas valores presencia huellas informe met den don reporte reportes'.split(' '));
const fijas = new Set('trabajos decisiones fuentes pares bitacora nac sinid contrato reportes'.split(' '));
const campos = new Set('id nombre programa unidad fecha_corte por tipo par fuente fila decision estado hora estado_clave'.split(' '));
const estados = new Set(['pendiente', 'procesando', 'listo', 'duplicado', 'error']);
const categorias = new Set(['persona', 'restituir_fila', 'trabajo', 'fuente']);
const entero = (v: unknown) => v != null && /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) ? Number(v) : null;
const atributo = (xs: unknown[], campo: string) => {
  for (let i = 0; i < xs.length; i += 2) if (xs[i] === campo) return xs[i + 1];
  return null;
};

// Ni los nombres de campo arbitrarios ni los valores de texto libre son metadatos públicos.
export function entradaSegura(pares: string[]) {
  const visibles = [];
  const programas = catalogo().iniciativas;
  for (let i = 0; i < pares.length; i += 2) {
    const campo = pares[i], v = pares[i + 1];
    if (!campos.has(campo)) continue;
    const valor = campo === 'programa' ? programas.find(p => p.id === v || p.nombre === v)?.nombre
      : campo === 'tipo' && categorias.has(v) ? v
      : campo === 'estado' && estados.has(v) ? v
      : campo === 'hora' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v) ? v : null;
    visibles.push({ campo, valor: valor ?? null });
  }
  return visibles;
}

function familia(clave: string) {
  const [, nombre, sufijo] = clave.split(':', 3);
  if (sufijo !== undefined && familias.has(nombre)) return `eira:${nombre}:*`;
  if (sufijo === undefined && fijas.has(nombre)) return `eira:${nombre}`;
  return 'Otros prefijos eira:*';
}

async function mapa() {
  const v = valkey();
  const lotes = await Promise.all(tipos.map(async tipo => {
    const vistas = new Set<string>();
    let cursor = '0';
    do {
      const [siguiente, claves] = await v.scan(cursor, 'MATCH', 'eira:*', 'COUNT', 256, 'TYPE', tipo);
      for (const k of claves) vistas.add(k);
      cursor = siguiente;
    } while (cursor !== '0');
    return { tipo, vistas };
  }));
  const filas = lotes.flatMap(({tipo, vistas}) => {
    const grupos = new Map<string, number>();
    for (const k of vistas) grupos.set(familia(k), (grupos.get(familia(k)) ?? 0) + 1);
    return [...grupos].map(([prefijo, cantidad]) => ({ prefijo, tipo, cantidad }));
  }).sort((a,b) => b.cantidad - a.cantidad || a.prefijo.localeCompare(b.prefijo));
  const conjuntos = [...lotes[0].vistas].filter(k => k.startsWith('eira:per:') && k !== 'eira:per:todas');
  const tamanos: { dimension: string; cantidad: number }[] = [];
  const dimensiones = new Set('programa impacto impactadas donantes tipo ciudad periodo servicio certeza'.split(' '));
  for (let i = 0; i < conjuntos.length; i += 128) {
    const lote = v.pipeline();
    for (const k of conjuntos.slice(i, i+128)) lote.scard(k);
    const r = await lote.exec();
    if (!r) throw new Error('Lectura interrumpida');
    for (const [j, [error, n]] of r.entries()) {
      if (error) throw error;
      const dimension = conjuntos[i+j].split(':')[2];
      tamanos.push({ dimension: dimensiones.has(dimension) ? dimension : 'otros', cantidad: Number(n) });
    }
  }
  return { filas, tamanos: tamanos.sort((a,b) => a.dimension.localeCompare(b.dimension) || b.cantidad-a.cantidad) };
}

async function flujo(clave: typeof flujos[number]) {
  const v = valkey();
  try {
    const [info, grupos, entradas] = await Promise.all([
      v.xinfo('STREAM', clave) as Promise<unknown[]>, v.xinfo('GROUPS', clave) as Promise<unknown[][]>,
      v.xrevrange(clave, '+', '-', 'COUNT', 5),
    ]);
    const g = grupos.find(xs => atributo(xs, 'name') === 'procesadores');
    const lectores = g ? await v.xinfo('CONSUMERS', clave, 'procesadores') as unknown[][] : [];
    return {
      clave, longitud: entero(atributo(info, 'length')),
      grupo: g ? { pendientes: entero(atributo(g, 'pending')), retraso: entero(atributo(g, 'lag')),
        lectores: lectores.map(xs => ({ idle: entero(atributo(xs, 'idle')), pendientes: entero(atributo(xs, 'pending')) })) } : null,
      entradas: entradas.map(([, pares]) => entradaSegura(pares)),
    };
  } catch (e) {
    if (e instanceof Error && /no such key/i.test(e.message)) return { clave, longitud: null, grupo: null, entradas: [] };
    throw e;
  }
}

async function muestra() {
  const v = valkey(), db = Number(v.options.db ?? 0);
  const [secciones, claves, indice, streams, personas, pares, canal] = await Promise.all([
    Promise.all(['server','clients','memory','stats','keyspace','persistence'].map(s => v.info(s))),
    v.dbsize(), mapa(), Promise.all(flujos.map(flujo)), v.scard('eira:per:todas'), v.hlen('eira:pares'),
    v.pubsub('NUMSUB', 'eira:eventos'),
  ]);
  const info = new Map(secciones.join('\n').split(/\r?\n/).filter(s => s.includes(':')).map(s => {
    const p = s.indexOf(':'); return [s.slice(0,p), s.slice(p+1)] as const;
  }));
  const n = (k: string) => entero(info.get(k));
  const espacio = Object.fromEntries((info.get(`db${db}`) ?? '').split(',').map(x => x.split('=')));
  return {
    leido: new Date().toISOString(), db, claves, caducan: entero(espacio.expires) ?? 0, ttl: entero(espacio.avg_ttl),
    version: info.get('valkey_version') ?? null, modo: info.get('server_mode') ?? info.get('redis_mode') ?? null,
    uptime: n('uptime_in_seconds'), clientes: n('connected_clients'), memoria: n('used_memory'), pico: n('used_memory_peak'),
    ops: n('instantaneous_ops_per_sec'), aciertos: n('keyspace_hits'), fallos: n('keyspace_misses'),
    aof: n('aof_enabled'), rdb: info.get('rdb_last_bgsave_status') ?? null, guardados: n('rdb_saves'),
    suscriptores: entero(canal[1]), personas, pares, ...indice, streams,
  };
}

// Comparte el sondeo entre pestañas; una lectura lenta nunca se solapa con otra.
let enCurso: Promise<Awaited<ReturnType<typeof muestra>>> | null = null;
let ultima: Awaited<ReturnType<typeof muestra>> | null = null;
export function leerMonitor() {
  if (ultima && Date.now() - Date.parse(ultima.leido) < 1500) return Promise.resolve(ultima);
  return enCurso ??= muestra().then(d => ultima = d).finally(() => { enCurso = null; });
}
export type Monitor = Awaited<ReturnType<typeof leerMonitor>>;
