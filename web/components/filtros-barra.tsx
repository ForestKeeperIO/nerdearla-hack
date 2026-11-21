'use client';

// Barra de filtros multi-selección (headless: semántica y estados, sin
// decisiones visuales). Cada dimensión es un grupo de casillas; los filtros
// activos aparecen como fichas quitables; "Quitar todos" limpia la URL.
// El estado vive en los parámetros de la URL: compartible y recargable.
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { aQuery, DIMENSIONES, ETIQUETA_DIM, type Dimension, type FiltrosMulti } from '@/lib/filtros-comun';

export function FiltrosBarra({
  opciones,
  activos,
}: {
  /** Valores disponibles por dimensión (vienen de eira:valores:<dim>). */
  opciones: Record<Dimension, string[]>;
  activos: FiltrosMulti;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function navegar(f: FiltrosMulti) {
    const q = aQuery(f);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function alterna(dim: Dimension, valor: string, marcado: boolean) {
    const actual = new Set(activos[dim]);
    if (marcado) actual.add(valor);
    else actual.delete(valor);
    navegar({ ...activos, [dim]: [...actual] });
  }

  const hayActivos = DIMENSIONES.some((d) => activos[d].length > 0);
  const sinOpciones = DIMENSIONES.every((d) => opciones[d].length === 0);

  if (sinOpciones) {
    return (
      <p className="etiqueta" role="status">
        Todavía no hay datos para filtrar: sube los archivos de cada programa primero.
      </p>
    );
  }

  return (
    <div data-parte="filtros" aria-label="Filtros del tablero">
      {DIMENSIONES.map((dim) =>
        opciones[dim].length === 0 ? null : (
          <fieldset key={dim} data-dimension={dim} style={{ border: 0, padding: 0, margin: '0 0 var(--sp-4)' }}>
            <legend className="etiqueta mono" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {ETIQUETA_DIM[dim]}
            </legend>
            <ul role="list" className="flex flex-wrap" style={{ gap: 'var(--sp-2)', listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
              {opciones[dim].map((valor) => {
                const marcado = activos[dim].includes(valor);
                return (
                  <li key={valor}>
                    <label
                      className="btn btn--sm"
                      data-marcado={marcado || undefined}
                      style={{
                        cursor: 'pointer',
                        border: '1px solid var(--linea-fuerte)',
                        borderRadius: 'var(--r-sm)',
                        background: marcado ? 'var(--rubor)' : 'var(--superficie)',
                        color: marcado ? 'var(--vino)' : 'var(--tinta)',
                        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={marcado}
                        onChange={(e) => alterna(dim, valor, e.target.checked)}
                      />
                      {valor}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ),
      )}

      {hayActivos && (
        <div data-parte="filtros-activos" style={{ marginTop: 'var(--sp-3)' }}>
          <ul role="list" aria-label="Filtros activos" className="flex flex-wrap" style={{ gap: 'var(--sp-2)', listStyle: 'none', padding: 0, margin: 0 }}>
            {DIMENSIONES.flatMap((dim) =>
              activos[dim].map((valor) => (
                <li key={`${dim}:${valor}`}>
                  <button
                    type="button"
                    className="estado"
                    style={{ cursor: 'pointer' }}
                    onClick={() => alterna(dim, valor, false)}
                    aria-label={`Quitar filtro ${ETIQUETA_DIM[dim]}: ${valor}`}
                  >
                    {ETIQUETA_DIM[dim]}: {valor} ×
                  </button>
                </li>
              )),
            )}
            <li>
              <button
                type="button"
                className="btn btn--quieto btn--sm"
                onClick={() => navegar({ programa: [], ciudad: [], periodo: [], servicio: [] })}
              >
                Quitar todos los filtros
              </button>
            </li>
          </ul>
        </div>
      )}
      {/* El parámetro actual queda accesible para lectores de pantalla y depuración. */}
      <p className="sr-only" aria-live="polite">
        {sp.size > 0 ? `Filtros activos: ${sp.toString()}` : 'Sin filtros.'}
      </p>
    </div>
  );
}
