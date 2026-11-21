// Parte de los filtros segura para el navegador: tipos, dimensiones y
// (de)serialización de la URL. NO importa nada de servidor ni de Valkey.
export const DIMENSIONES = ['estado', 'municipio', 'programa', 'servicio', 'periodo'] as const;
export type Dimension = (typeof DIMENSIONES)[number];

export const ETIQUETA_DIM: Record<Dimension, string> = {
  programa: 'Programa',
  estado: 'Estado',
  municipio: 'Municipio',
  periodo: 'Periodo',
  servicio: 'Tipo de servicio',
};

export type FiltrosMulti = Record<Dimension, string[]>;

export const FILTROS_VACIOS: FiltrosMulti = { estado: [], municipio: [], programa: [], periodo: [], servicio: [] };

export type Opcion = {
  valor: string; texto: string; cuenta?: number; unidad?: string; grupo?: string; alias?: string[];
};
export type Opciones = Record<Dimension, Opcion[]>;

export function normaliza(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
}

export function filtrosDeQuery(sp: Record<string, string | string[] | undefined>): FiltrosMulti {
  const f: FiltrosMulti = { ...FILTROS_VACIOS };
  for (const dim of DIMENSIONES) {
    const bruto = sp[dim];
    const texto = Array.isArray(bruto) ? bruto.join(',') : (bruto ?? '');
    f[dim] = [...new Set(texto.split(',').map((s) => s.trim()).filter(Boolean))];
  }
  return f;
}

export function aQuery(f: FiltrosMulti): string {
  const q = new URLSearchParams();
  for (const dim of DIMENSIONES) if (f[dim].length > 0) q.set(dim, f[dim].join(','));
  return q.toString();
}

export function hayFiltros(f: FiltrosMulti): boolean {
  return DIMENSIONES.some((d) => f[d].length > 0);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-04' → 'abr 2026'. Si no es un periodo AAAA-MM, devuelve el valor tal cual. */
export function etiquetaPeriodo(valor: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!m) return valor;
  const mes = Number(m[2]);
  return mes >= 1 && mes <= 12 ? `${MESES[mes - 1]} ${m[1]}` : valor;
}

/** Etiqueta visible de un valor de filtro: siempre texto humano, nunca el id crudo. */
export function etiquetaValor(dim: Dimension, valor: string): string {
  return dim === 'periodo' ? etiquetaPeriodo(valor) : valor;
}
