import { DIMENSIONES, etiquetaPeriodo, filtrosDeQuery, type Dimension, type FiltrosMulti, type Opciones } from './filtros-comun';

export type Campo = Exclude<Dimension, 'periodo'>;
export type Seleccion = Omit<FiltrosMulti, 'periodo'> & { desde: string; hasta: string };
export const CAMPOS: Campo[] = ['estado', 'municipio', 'programa', 'servicio'];
export const VACIA: Seleccion = { estado: [], municipio: [], programa: [], servicio: [], desde: '', hasta: '' };
const mesValido = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
type Query = Record<string, string | string[] | undefined>;

export function seleccionDe(sp: Query): Seleccion {
  const { periodo, ...otros } = filtrosDeQuery(sp);
  const meses = periodo.filter(mesValido).sort();
  const desde = mesValido(sp.desde) ? sp.desde : meses[0] || '';
  const hasta = mesValido(sp.hasta) ? sp.hasta : meses.at(-1) || '';
  return { ...otros, desde, hasta: desde && hasta && desde > hasta ? desde : hasta };
}

export function consultaDe(f: Seleccion) {
  const q = new URLSearchParams();
  for (const d of CAMPOS) if (f[d].length) q.set(d, f[d].join(','));
  if (f.desde) q.set('desde', f.desde);
  if (f.hasta) q.set('hasta', f.hasta);
  return q.toString();
}

export function periodoTexto(f: Seleccion) {
  const a = etiquetaPeriodo(f.desde), b = etiquetaPeriodo(f.hasta);
  if (!a && !b) return 'Todo el periodo';
  if (!a || !b) return a ? `Desde ${a}` : `Hasta ${b}`;
  if (a === b) return a;
  return `${f.desde.slice(0,4) === f.hasta.slice(0,4) ? a.split(' ')[0] : a}–${b}`;
}

export function indiceMes(mes: string) {
  const [anio, n] = mes.split('-').map(Number);
  return anio*12 + n-1;
}

export function mesDeIndice(i: number) {
  return `${String(Math.floor(i/12)).padStart(4,'0')}-${String(i%12+1).padStart(2,'0')}`;
}

/** Ventana inmediatamente anterior, de la misma duración; Todo no tiene base comparable. */
export function periodoAnterior(f: Seleccion): Seleccion | null {
  if (!f.desde || !f.hasta) return null;
  const a = indiceMes(f.desde), b = indiceMes(f.hasta);
  return a-(b-a+1) < 0 ? null : { ...f, desde: mesDeIndice(a-(b-a+1)), hasta: mesDeIndice(a-1) };
}

export function filtrosActivos(f: Seleccion) {
  return DIMENSIONES.filter(d => d === 'periodo' ? f.desde || f.hasta : f[d].length).length;
}

const plurales = { estado: 'estados', municipio: 'municipios', programa: 'programas', servicio: 'servicios' };
export function resumenCampo(d: Campo, f: Seleccion, opciones: Opciones) {
  const valores = f[d];
  if (!valores.length) return d === 'programa' ? 'Todos los programas' : `Todos los ${plurales[d]}`;
  if (valores.length > 1) return `${valores.length} ${plurales[d]}`;
  return opciones[d].find(o => o.valor === valores[0])?.texto ?? valores[0];
}
