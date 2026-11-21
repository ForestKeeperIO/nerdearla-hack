import { valkey } from './valkey';
import { senalEventos } from './senal-eventos';

const prefijo = 'eira:';
const entero = (s: string | null) => s !== null && /^\d+$/.test(s) && Number.isSafeInteger(+s) ? +s : null;
const campos = (xs: unknown[]) => Object.fromEntries(
  xs.flatMap((v, i) => i % 2 ? [] : [[String(v), String(xs[i + 1])]]),
) as Record<string, string>;

async function indice() {
  const claves = new Set<string>();
  let cursor = '0';
  do {
    const [sig, lote] = await valkey().scan(cursor, 'MATCH', 'eira:*', 'COUNT', 256);
    lote.forEach(k => claves.add(k));
    cursor = sig;
  } while (cursor !== '0');
  return [...claves];
}

async function flujo(clave: string, existe: boolean) {
  const v = valkey();
  if (!existe) return { clave, mensajes: 0, grupos: [] };
  const [mensajes, info] = await Promise.all([v.xlen(clave), v.xinfo('GROUPS', clave)]);
  const grupos = await Promise.all((info as unknown[][]).map(async r => {
    const nombre = campos(r).name;
    const [pendientes] = await v.xpending(clave, nombre) as [number, ...unknown[]];
    return { nombre, pendientes };
  }));
  return { clave, mensajes, grupos };
}

const veredictos: Record<string,string> = {
  identico: 'Duplicado idéntico', mismo_contenido: 'Mismo contenido',
  version_nueva: 'Versión nueva', traslape_parcial: 'Traslape parcial',
};
const estados: Record<string,string> = {
  listo: 'Listo', pendiente: 'Pendiente', procesando: 'Procesando', error: 'Error', duplicado: 'Duplicado',
};

export async function leerObservatorio() {
  const v = valkey();
  const claves = await indice();
  const [
    trabajos, recientes, fuentes, identidades, revisiones, nacimientos, ciudades,
    unicas, sinId, bitacora, streams,
  ] = await Promise.all([
    Promise.all(claves.filter(k => k.startsWith('eira:trabajo:')).map(async k => {
      const [estado, filas] = await v.hmget(k, 'estado', 'filas');
      return { estado, filas: entero(filas) };
    })),
    v.xrevrange('eira:trabajos', '+', '-', 'COUNT', 5),
    v.zrange('eira:fuentes', 0, -1),
    Promise.all(claves.filter(k => k.startsWith('eira:per:')).map(async k =>
      ({ programa: k.startsWith('eira:per:programa:'), ids: await v.smembers(k) }))),
    v.hvals('eira:pares'), v.hkeys('eira:nac'), v.smembers('eira:valores:ciudad'),
    v.scard('eira:per:todas'), v.hlen('eira:sinid'),
    v.xrevrange('eira:bitacora', '+', '-', 'COUNT', 1),
    Promise.all(['trabajos', 'decisiones'].map(s => flujo(prefijo+s, claves.includes(prefijo+s)))),
  ]);

  const rechazados = trabajos.filter(t => t.estado === 'duplicado');
  const sumaFilas = (ts: typeof trabajos) => ts.some(t => t.filas === null)
    ? null : ts.reduce((n,t) => n + t.filas!, 0);
  const descartadas = sumaFilas(rechazados);
  const recibidas = sumaFilas(trabajos);
  const omisiones = await Promise.all(fuentes.map(async id => {
    const [lista, [total, nuevas]] = await Promise.all([
      v.lrange(`eira:omitidas:${id}`, 0, -1), v.hmget(`eira:fuente:${id}`, 'filas_omitidas', 'filas_nuevas'),
    ]);
    let internas = 0;
    for (const item of lista) {
      const { ya_en_fuente } = JSON.parse(item);
      if (typeof ya_en_fuente !== 'string' || !ya_en_fuente) return null;
      if (ya_en_fuente === id) internas++;
    }
    return entero(total) === lista.length && entero(nuevas) !== null
      ? { internas, previas: lista.length - internas, nuevas: Number(nuevas) } : null;
  }));
  const omitidas = (k: 'internas' | 'previas' | 'nuevas') => omisiones.some(x => !x)
    ? null : omisiones.reduce((s,x) => s + x![k], 0);

  // Los conjuntos permiten demostrar coincidencias entre programas, no cómo se resolvieron.
  const unaVez = new Set<string>(), compartidas = new Set<string>();
  for (const conjunto of identidades.filter(x => x.programa)) {
    for (const id of conjunto.ids) {
      if (unaVez.has(id)) compartidas.add(id);
      unaVez.add(id);
    }
  }
  const pares = revisiones.map(s => JSON.parse(s));
  const opaco = (s: string) => /^p[0-9a-f]{15}$/.test(s);
  const ladoSeguro = (lado: {etiqueta?: string} | null) => {
    if (!lado || Object.keys(lado).some(k => !['etiqueta','fuente','fila'].includes(k))) return false;
    const [iniciales, ...extras] = String(lado.etiqueta ?? '').split(' · ');
    return /^(?:\p{L}\. ?){1,4}$/u.test(iniciales) && extras.every(s => ciudades.includes(s) || /^\d{1,3} años$/.test(s));
  };
  const identidadVerificada = unicas > 0 && identidades.every(x => x.ids.every(opaco))
    && nacimientos.every(opaco) && pares.every(p => ladoSeguro(p.a) && ladoSeguro(p.b));

  const cargas = await Promise.all(recientes.map(async ([sid, pares]) => {
    const t = campos(pares);
    const [nombre, estado, nivel, fuente, original] = await v.hmget(`eira:trabajo:${t.id}`,
      'nombre', 'estado', 'nivel_duplicado', 'fuente', 'fuente_original');
    const ref = fuente || (estado === 'duplicado' ? original : '');
    const nota = ref ? entero(await v.hget(`eira:fuente:${ref}`, 'estrellas')) : null;
    return {
      sid, nombre: nombre || t.nombre || 'Archivo sin nombre',
      veredicto: estado === 'listo' && nivel === 'identico' ? 'Republicado'
        : veredictos[nivel ?? ''] || estados[estado ?? ''] || 'Sin veredicto',
      estrellas: nota !== null && nota >= 1 && nota <= 5 ? nota : null,
      original: estado === 'duplicado' && !!original,
    };
  }));
  const pendientes = pares.filter(p => p.estado === 'pendiente').length;
  const decididos = pares.filter(p => p.estado === 'misma' || p.estado === 'distinta').length;
  return {
    leidoEn: new Date().toISOString(), recibidas, rechazados: rechazados.length,
    descartadas, previas: omitidas('previas'), internas: omitidas('internas'), aceptadas: omitidas('nuevas'),
    sinLectura: trabajos.filter(t => t.filas === null).length,
    coincidentes: compartidas.size, pendientes, decididos, unicas, sinId, cargas,
    claves: claves.length, streams, ultimoEvento: bitacora[0] ? campos(bitacora[0][1]).en ?? null : null,
    canal: senalEventos(), identidadVerificada,
    archivosTemporales: claves.filter(k => k.startsWith('eira:archivo:')).length,
  };
}

export type Observatorio = Awaited<ReturnType<typeof leerObservatorio>>;
