// Filtros de usuario con multi-selección, para el tablero.
// Diferencia con `Filtros` (comun.ts): cada dimensión acepta varios valores
// (OR dentro de la dimensión, AND entre dimensiones) y el estado vive en la
// URL (?programa=a,b&ciudad=x). Conteo exacto igual: SUNION por dimensión
// (comando de solo lectura) e intersección entre dimensiones en memoria.
import { valkey } from './valkey';
export { DIMENSIONES, ETIQUETA_DIM, FILTROS_VACIOS, aQuery, filtrosDeQuery, hayFiltros } from './filtros-comun';
import { DIMENSIONES, type Dimension, type FiltrosMulti } from './filtros-comun';
import { cnt, perCiudad, perPeriodo, perPrograma, perServicio, perTodas, valores } from './claves';
import { edadPromedioIds } from './datos';
import type { CiudadConteo, Med, Unidad } from './comun';

const claveDim: Record<Dimension, (v: string) => string> = {
  programa: perPrograma,
  ciudad: perCiudad,
  periodo: perPeriodo,
  servicio: perServicio,
};

async function medir<T>(comando: string, fn: () => Promise<T>): Promise<Med<T>> {
  const t0 = performance.now();
  const valor = await fn();
  return { valor, comando, ms: Math.round(performance.now() - t0) };
}

/** Comandos de Valkey que producirían el resultado, para "Cómo se calculó". */
function describeComandos(f: FiltrosMulti): string {
  const partes = [`SMEMBERS ${perTodas()}`];
  for (const dim of DIMENSIONES) {
    const vs = f[dim];
    if (vs.length === 0) continue;
    const claves = vs.map((v) => claveDim[dim](v));
    partes.push(vs.length === 1 ? `SMEMBERS ${claves[0]}` : `SUNION ${claves.join(' ')}`);
  }
  return partes.join(' → intersección local ← ');
}

/** Miembros (personas opacas) que cumplen todos los filtros activos. Conteo exacto. */
export async function miembrosMulti(f: FiltrosMulti): Promise<Med<string[]>> {
  const comando = describeComandos(f);
  return medir(comando, async () => {
    const v = valkey();
    let base = new Set(await v.smembers(perTodas()));
    for (const dim of DIMENSIONES) {
      const vs = f[dim];
      if (vs.length === 0 || base.size === 0) continue;
      const claves = vs.map((x) => claveDim[dim](x));
      const miembros =
        claves.length === 1 ? await v.smembers(claves[0]) : ((await v.call('SUNION', ...claves)) as string[]);
      const s = new Set(miembros);
      base = new Set([...base].filter((id) => s.has(id)));
    }
    return [...base];
  });
}

/** Personas únicas bajo los filtros (personas alcanzadas). */
export async function personasUnicasMulti(f: FiltrosMulti): Promise<Med<number>> {
  const m = await miembrosMulti(f);
  return { valor: m.valor.length, comando: m.comando, ms: m.ms };
}

/** Un campo de hash es "programa|ciudad|periodo|servicio" y cuenta registros. */
function coincideMulti(campo: string, f: FiltrosMulti): boolean {
  const [programa, ciudad, periodo, servicio] = campo.split('|');
  if (f.programa.length > 0 && !f.programa.includes(programa)) return false;
  if (f.ciudad.length > 0 && !f.ciudad.includes(ciudad)) return false;
  if (f.periodo.length > 0 && !f.periodo.includes(periodo)) return false;
  if (f.servicio.length > 0 && !f.servicio.includes(servicio)) return false;
  return true;
}

async function sumaHashMulti(clave: string, f: FiltrosMulti): Promise<Med<number>> {
  return medir(`HGETALL ${clave} (suma de campos que cumplen el filtro)`, async () => {
    const h = await valkey().hgetall(clave);
    let suma = 0;
    for (const [campo, n] of Object.entries(h)) if (coincideMulti(campo, f)) suma += Number(n);
    return suma;
  });
}

/** Conteo de una unidad (atencion, estudio, participacion, entrega_insumo…) bajo los filtros. Nunca se suman unidades entre sí. */
export async function conteoUnidadMulti(unidad: Unidad, f: FiltrosMulti): Promise<Med<number>> {
  return sumaHashMulti(cnt(unidad), f);
}

/** Edad promedio de las personas filtradas a la fecha de corte (con n). */
export async function edadPromedioMulti(f: FiltrosMulti, fechaCorte: string) {
  const m = await miembrosMulti(f);
  const edad = await edadPromedioIds(m.valor, fechaCorte);
  return { ...edad, comando: `${m.comando} → ${edad.comando}` };
}

/** Personas únicas por municipio bajo los filtros (ignorando el filtro de municipio). */
export async function personasPorCiudadMulti(f: FiltrosMulti): Promise<Med<CiudadConteo[]>> {
  const sinCiudad: FiltrosMulti = { ...f, ciudad: [] };
  return medir(`SMEMBERS ${valores('ciudad')} → ${describeComandos(sinCiudad)}`, async () => {
    const v = valkey();
    const base = new Set((await miembrosMulti(sinCiudad)).valor);
    const lista: CiudadConteo[] = [];
    for (const c of (await v.smembers(valores('ciudad'))).sort()) {
      const enCiudad = await v.smembers(perCiudad(c));
      lista.push({ ciudad: c, personas: enCiudad.filter((id) => base.has(id)).length });
    }
    return lista.sort((a, b) => b.personas - a.personas);
  });
}

