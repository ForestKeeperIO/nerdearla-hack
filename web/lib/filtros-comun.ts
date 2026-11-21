// Parte de los filtros segura para el navegador: tipos, dimensiones y
// (de)serialización de la URL. NO importa nada de servidor ni de Valkey.
export const DIMENSIONES = ['programa', 'ciudad', 'periodo', 'servicio'] as const;
export type Dimension = (typeof DIMENSIONES)[number];

export const ETIQUETA_DIM: Record<Dimension, string> = {
  programa: 'Programa',
  ciudad: 'Municipio',
  periodo: 'Periodo',
  servicio: 'Tipo de servicio',
};

export type FiltrosMulti = Record<Dimension, string[]>;

export const FILTROS_VACIOS: FiltrosMulti = { programa: [], ciudad: [], periodo: [], servicio: [] };

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
