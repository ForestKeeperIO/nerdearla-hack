// Funciones de lectura sobre Valkey según docs/contrato-valkey.md.
// Cada cifra devuelve además { comando, ms }: el comando de Valkey que la
// produjo y cuánto tardó, para el desplegable "Cómo se calculó".
import { valkey } from './valkey';
import {
  anom, bitacora, cnt, den, fuente, fuentes, nac, omitidas, pares,
  perCerteza, perCiudad, perPeriodo, perPrograma, perServicio, perTodas,
  sinid, trabajo, trabajos, valores,
} from './claves';

import type {
  Anomalia, CiudadConteo, Cobertura, EntradaBitacora, Filtros, Fuente, Med,
  Omitida, Par, Trabajo, Unidad,
} from './comun';
import { NOMBRE_UNIDAD, UNIDADES } from './comun';

export type {
  Anomalia, CiudadConteo, Cobertura, EntradaBitacora, Filtros, Fuente, Med,
  Omitida, Par, Trabajo, Unidad,
};
export { NOMBRE_UNIDAD, UNIDADES, personasTxt } from './comun';
import { personasTxt } from './comun';

async function medir<T>(comando: string, f: () => Promise<T>): Promise<Med<T>> {
  const t0 = performance.now();
  const valor = await f();
  const ms = Math.round((performance.now() - t0) * 10) / 10;
  return { valor, comando, ms };
}

// --- Conjuntos de personas ----------------------------------------------------

/** Claves de conjuntos que representan los filtros activos. Siempre incluye eira:per:todas. */
export function clavesFiltro(f: Filtros): string[] {
  const ks = [perTodas()];
  if (f.programa) ks.push(perPrograma(f.programa));
  if (f.ciudad) ks.push(perCiudad(f.ciudad));
  if (f.periodo) ks.push(perPeriodo(f.periodo));
  if (f.servicio) ks.push(perServicio(f.servicio));
  return ks;
}

function comandoInterseccion(ks: string[]): string {
  return ks.length === 1 ? `SCARD ${ks[0]}` : `SINTERCARD ${ks.length} ${ks.join(' ')}`;
}

async function miembros(f: Filtros): Promise<string[]> {
  const v = valkey();
  const ks = clavesFiltro(f);
  if (ks.length === 1) return v.smembers(ks[0]);
  return (await v.call('SINTER', ...ks)) as string[];
}

/** Personas únicas identificadas bajo los filtros (conteo exacto). */
export async function personasUnicas(f: Filtros): Promise<Med<number>> {
  const ks = clavesFiltro(f);
  return medir(comandoInterseccion(ks), async () => {
    const v = valkey();
    if (ks.length === 1) return v.scard(ks[0]);
    return Number(await v.call('SINTERCARD', ks.length, ...ks));
  });
}

/** Personas del nivel de certeza (`folio` o `id`) que además cumplen los filtros. */
export async function personasCerteza(nivel: 'folio' | 'id', f: Filtros): Promise<Med<number>> {
  const ks = [perCerteza(nivel), ...clavesFiltro(f)];
  return medir(comandoInterseccion(ks), async () =>
    Number(await valkey().call('SINTERCARD', ks.length, ...ks)),
  );
}

// --- Conteos por unidad ---------------------------------------------------------

function coincide(campo: string, f: Filtros): boolean {
  const [programa, ciudad, periodo, servicio] = campo.split('|');
  if (f.programa && programa !== f.programa) return false;
  if (f.ciudad && ciudad !== f.ciudad) return false;
  if (f.periodo && periodo !== f.periodo) return false;
  if (f.servicio && servicio !== f.servicio) return false;
  return true;
}

async function sumaHash(clave: string, f: Filtros): Promise<Med<number>> {
  return medir(`HGETALL ${clave} (suma de campos que cumplen el filtro)`, async () => {
    const h = await valkey().hgetall(clave);
    let suma = 0;
    for (const [campo, n] of Object.entries(h)) {
      if (coincide(campo, f)) suma += Number(n);
    }
    return suma;
  });
}

/** Conteo de una unidad (atencion, estudio, …) bajo los filtros. */
export async function conteoUnidad(unidad: Unidad, f: Filtros): Promise<Med<number>> {
  return sumaHash(cnt(unidad), f);
}

/** Unidades que tienen al menos un campo de conteo. */
export async function unidadesConDatos(): Promise<Med<Unidad[]>> {
  return medir(`HLEN ${UNIDADES.map((u) => cnt(u)).join(' · ')}`, async () => {
    const v = valkey();
    const hay: Unidad[] = [];
    for (const u of UNIDADES) if ((await v.hlen(cnt(u))) > 0) hay.push(u);
    return hay;
  });
}

/** Registros sin persona identificada bajo los filtros. */
export async function sinIdentificar(f: Filtros): Promise<Med<number>> {
  return sumaHash(sinid(), f);
}

// --- Edad promedio ---------------------------------------------------------------

/** Edad promedio de las personas del filtro a la fecha de corte. Devuelve también n. */
export async function edadPromedio(
  f: Filtros,
  fechaCorte: string,
): Promise<Med<{ promedio: number | null; n: number }>> {
  const ks = clavesFiltro(f);
  const comando =
    (ks.length === 1 ? `SMEMBERS ${ks[0]}` : `SINTER ${ks.join(' ')}`) +
    ` → HMGET ${nac()} <personas>`;
  return medir(comando, async () => {
    const ids = await miembros(f);
    if (ids.length === 0) return { promedio: null, n: 0 };
    const nacimientos = await valkey().hmget(nac(), ...ids);
    const corte = new Date(fechaCorte + 'T00:00:00Z');
    let suma = 0;
    let n = 0;
    for (const s of nacimientos) {
      if (!s) continue;
      const d = new Date(s + 'T00:00:00Z');
      if (isNaN(d.getTime())) continue;
      let edad = corte.getUTCFullYear() - d.getUTCFullYear();
      const m = corte.getUTCMonth() - d.getUTCMonth();
      if (m < 0 || (m === 0 && corte.getUTCDate() < d.getUTCDate())) edad--;
      if (edad >= 0 && edad < 120) {
        suma += edad;
        n++;
      }
    }
    return { promedio: n ? Math.round((suma / n) * 10) / 10 : null, n };
  });
}

// --- Desglose por ciudad ---------------------------------------------------------

/** Personas únicas por ciudad bajo los filtros (sin el filtro de ciudad). */
export async function personasPorCiudad(f: Filtros): Promise<Med<CiudadConteo[]>> {
  const ciudades = await valkey().smembers(valores('ciudad'));
  const base = clavesFiltro({ ...f, ciudad: undefined });
  return medir(
    `SMEMBERS eira:valores:ciudad → ${comandoInterseccion(['eira:per:ciudad:<c>', ...base])}`,
    async () => {
      const v = valkey();
      const lista: CiudadConteo[] = [];
      for (const c of ciudades.sort()) {
        const ks = [perCiudad(c), ...base];
        const n =
          ks.length === 1
            ? await v.scard(ks[0])
            : Number(await v.call('SINTERCARD', ks.length, ...ks));
        lista.push({ ciudad: c, personas: n });
      }
      return lista.sort((a, b) => b.personas - a.personas);
    },
  );
}

/** Cruce entre programas: personas presentes en cada par de programas. */
export async function cruceProgramas(f: Filtros): Promise<Med<{ par: [string, string]; n: number }[]>> {
  const programas = (await valkey().smembers(valores('programa'))).sort();
  const base = clavesFiltro({ ...f, programa: undefined });
  return medir(
    `SMEMBERS eira:valores:programa → ${comandoInterseccion(['eira:per:programa:<a>', 'eira:per:programa:<b>', ...base])}`,
    async () => {
      const v = valkey();
      const lista: { par: [string, string]; n: number }[] = [];
      for (let i = 0; i < programas.length; i++) {
        for (let j = i + 1; j < programas.length; j++) {
          const ks = [perPrograma(programas[i]), perPrograma(programas[j]), ...base];
          lista.push({
            par: [programas[i], programas[j]],
            n: Number(await v.call('SINTERCARD', ks.length, ...ks)),
          });
        }
      }
      return lista.sort((a, b) => b.n - a.n);
    },
  );
}

// --- Cobertura -------------------------------------------------------------------

/** Personas alcanzadas por ciudad contra mujeres de 25 a 64 (INEGI, Censo 2020). */
export async function coberturaPorCiudad(f: Filtros): Promise<Med<Cobertura[]>> {
  const ciudades = await valkey().smembers(valores('ciudad'));
  const base = clavesFiltro({ ...f, ciudad: undefined });
  const claveDen = den('mujeres_25_64');
  return medir(
    `SMEMBERS eira:valores:ciudad → ${comandoInterseccion(['eira:per:ciudad:<c>', ...base])} y HGET ${claveDen} <c>`,
    async () => {
      const v = valkey();
      const lista: Cobertura[] = [];
      for (const c of ciudades.sort()) {
        const ks = [perCiudad(c), ...base];
        const n =
          ks.length === 1
            ? await v.scard(ks[0])
            : Number(await v.call('SINTERCARD', ks.length, ...ks));
        const d = await v.hget(claveDen, c);
        lista.push({ ciudad: c, personas: n, denominador: d ? Number(d) : null });
      }
      return lista.sort((a, b) => b.personas - a.personas);
    },
  );
}

// --- Trabajos, fuentes, calidad ----------------------------------------------------

function aTrabajo(id: string, h: Record<string, string>): Trabajo {
  const num = (s: string | undefined) => (s ? Number(s) : 0);
  return {
    id,
    estado: h.estado ?? 'pendiente',
    nombre: h.nombre ?? '',
    programa: h.programa ?? '',
    unidad: h.unidad ?? '',
    fecha_corte: h.fecha_corte ?? '',
    por: h.por ?? '',
    creado_en: h.creado_en ?? '',
    terminado_en: h.terminado_en ?? '',
    mensaje: h.mensaje ?? '',
    nivel_duplicado: h.nivel_duplicado ?? '',
    fuente: h.fuente ?? '',
    fuente_original: h.fuente_original ?? '',
    filas: num(h.filas),
    filas_nuevas: num(h.filas_nuevas),
    filas_omitidas: num(h.filas_omitidas),
    filas_repetidas: num(h.filas_repetidas),
  };
}

/** Trabajos del stream eira:trabajos con su estado (hash eira:trabajo:<id>). */
export async function listarTrabajos(limite = 30): Promise<Med<Trabajo[]>> {
  return medir(`XREVRANGE ${trabajos()} + - COUNT ${limite} → HGETALL eira:trabajo:<id>`, async () => {
    const v = valkey();
    const entradas = (await v.xrevrange(trabajos(), '+', '-', 'COUNT', limite)) as
      | [string, string[]][]
      | null;
    const lista: Trabajo[] = [];
    const vistos = new Set<string>();
    for (const [, campos] of entradas ?? []) {
      const m: Record<string, string> = {};
      for (let i = 0; i < campos.length; i += 2) m[campos[i]] = campos[i + 1];
      if (!m.id || vistos.has(m.id)) continue;
      vistos.add(m.id);
      const h = await v.hgetall(trabajo(m.id));
      lista.push(aTrabajo(m.id, { ...m, ...h }));
    }
    return lista;
  });
}

function aFuente(id: string, h: Record<string, string>): Fuente {
  const num = (s: string | undefined) => (s ? Number(s) : 0);
  let motivos: string[] = [];
  try {
    motivos = h.motivos ? (JSON.parse(h.motivos) as string[]) : [];
  } catch {
    motivos = [];
  }
  return {
    id,
    nombre: h.nombre ?? '',
    programa: h.programa ?? '',
    unidad: h.unidad ?? '',
    fecha_corte: h.fecha_corte ?? '',
    cargada_en: h.cargada_en ?? '',
    por: h.por ?? '',
    filas: num(h.filas),
    filas_nuevas: num(h.filas_nuevas),
    filas_omitidas: num(h.filas_omitidas),
    inasistencias: num(h.inasistencias),
    estrellas: num(h.estrellas),
    puntaje: num(h.puntaje),
    motivos,
  };
}

/** Fuentes importadas (sorted set eira:fuentes), de la más reciente a la más antigua. */
export async function listarFuentes(): Promise<Med<Fuente[]>> {
  return medir(`ZREVRANGE ${fuentes()} 0 -1 → HGETALL eira:fuente:<id>`, async () => {
    const v = valkey();
    const ids = await v.zrevrange(fuentes(), 0, -1);
    const lista: Fuente[] = [];
    for (const id of ids) lista.push(aFuente(id, await v.hgetall(fuente(id))));
    return lista;
  });
}

/** Anomalías de una fuente agrupadas por regla. */
export async function anomaliasDe(fuenteId: string): Promise<Med<Record<string, Anomalia[]>>> {
  return medir(`LRANGE ${anom(fuenteId)} 0 -1`, async () => {
    const crudos = await valkey().lrange(anom(fuenteId), 0, -1);
    const porRegla: Record<string, Anomalia[]> = {};
    for (const s of crudos) {
      try {
        const a = JSON.parse(s) as Anomalia;
        (porRegla[a.regla] ??= []).push(a);
      } catch {
        // ignora entradas mal formadas
      }
    }
    return porRegla;
  });
}

/** Filas omitidas de una fuente. */
export async function omitidasDe(fuenteId: string): Promise<Med<Omitida[]>> {
  return medir(`LRANGE ${omitidas(fuenteId)} 0 -1`, async () => {
    const crudos = await valkey().lrange(omitidas(fuenteId), 0, -1);
    const lista: Omitida[] = [];
    for (const s of crudos) {
      try {
        lista.push(JSON.parse(s) as Omitida);
      } catch {
        // ignora entradas mal formadas
      }
    }
    return lista;
  });
}

/** Pares de personas pendientes de decisión. */
export async function listarPares(): Promise<Med<Par[]>> {
  return medir(`HGETALL ${pares()}`, async () => {
    const h = await valkey().hgetall(pares());
    const lista: Par[] = [];
    for (const s of Object.values(h)) {
      try {
        lista.push(JSON.parse(s) as Par);
      } catch {
        // ignora entradas mal formadas
      }
    }
    return lista.sort((a, b) => a.id.localeCompare(b.id));
  });
}

/** Últimas entradas de la bitácora. */
export async function leerBitacora(limite = 50): Promise<Med<EntradaBitacora[]>> {
  return medir(`XREVRANGE ${bitacora()} + - COUNT ${limite}`, async () => {
    const entradas = (await valkey().xrevrange(bitacora(), '+', '-', 'COUNT', limite)) as
      | [string, string[]][]
      | null;
    const lista: EntradaBitacora[] = [];
    for (const [id, campos] of entradas ?? []) {
      const m: Record<string, string> = {};
      for (let i = 0; i < campos.length; i += 2) m[campos[i]] = campos[i + 1];
      lista.push({ id, en: m.en ?? '', por: m.por ?? '', tipo: m.tipo ?? '', detalle: m.detalle ?? '' });
    }
    return lista;
  });
}

/** Valores vistos de una dimensión (programa, ciudad, periodo, servicio). */
export async function valoresDe(dim: 'programa' | 'ciudad' | 'periodo' | 'servicio'): Promise<Med<string[]>> {
  return medir(`SMEMBERS ${valores(dim)}`, async () =>
    (await valkey().smembers(valores(dim))).sort(),
  );
}

/** Fecha de corte del tablero: la más reciente entre las fuentes; hoy si no hay. */
export async function fechaCorteActual(): Promise<string> {
  const fs = await listarFuentes();
  let corte: string | null = null;
  for (const f of fs.valor) if (f.fecha_corte && (!corte || f.fecha_corte > corte)) corte = f.fecha_corte;
  return corte ?? new Date().toISOString().slice(0, 10);
}
