'use client';

// Barra de filtros multi-selección: una fila de menús desplegables (uno por
// dimensión) con insignia de conteo, y debajo una fila delgada de fichas con
// los filtros activos. El estado vive en la URL: compartible y recargable.
import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import {
  aQuery, DIMENSIONES, ETIQUETA_DIM, etiquetaValor,
  type Dimension, type FiltrosMulti,
} from '@/lib/filtros-comun';

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
  const raiz = useRef<HTMLDivElement>(null);

  // Un clic fuera cierra los menús abiertos.
  useEffect(() => {
    function alClic(e: MouseEvent) {
      if (!raiz.current?.contains(e.target as Node)) {
        raiz.current?.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
      }
    }
    document.addEventListener('click', alClic);
    return () => document.removeEventListener('click', alClic);
  }, []);

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
  const totalActivos = DIMENSIONES.reduce((n, d) => n + activos[d].length, 0);
  const sinOpciones = DIMENSIONES.every((d) => opciones[d].length === 0);

  if (sinOpciones) {
    return (
      <p className="etiqueta" role="status">
        Todavía no hay datos para filtrar: sube los archivos de cada programa primero.
      </p>
    );
  }

  return (
    <div ref={raiz} data-parte="filtros" aria-label="Filtros del tablero">
      <div className="filtros-fila" role="toolbar" aria-label="Elegir filtros">
        {DIMENSIONES.map((dim) =>
          opciones[dim].length === 0 ? null : (
            <details key={dim} className="filtro-pop" data-dimension={dim}>
              <summary className="btn btn--secundario btn--sm filtro-pop__boton">
                {ETIQUETA_DIM[dim]}
                {activos[dim].length > 0 && (
                  <span className="filtro-pop__conteo" aria-label={`${activos[dim].length} seleccionados`}>
                    {activos[dim].length}
                  </span>
                )}
                <ChevronDown size={14} aria-hidden className="filtro-pop__flecha" />
              </summary>
              <div className="filtro-pop__panel" role="group" aria-label={`Opciones de ${ETIQUETA_DIM[dim]}`}>
                <ul role="list">
                  {opciones[dim].map((valor) => {
                    const marcado = activos[dim].includes(valor);
                    return (
                      <li key={valor}>
                        <label className="filtro-opcion" data-marcado={marcado || undefined}>
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={(e) => alterna(dim, valor, e.target.checked)}
                          />
                          {etiquetaValor(dim, valor)}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          ),
        )}
        {hayActivos && (
          <button
            type="button"
            className="btn btn--quieto btn--sm"
            onClick={() => navegar({ programa: [], ciudad: [], periodo: [], servicio: [] })}
          >
            Quitar todos ({totalActivos})
          </button>
        )}
      </div>

      {hayActivos && (
        <ul
          role="list"
          aria-label="Filtros activos"
          className="filtros-chips"
        >
          {DIMENSIONES.flatMap((dim) =>
            activos[dim].map((valor) => (
              <li key={`${dim}:${valor}`}>
                <button
                  type="button"
                  className="filtros-chip"
                  onClick={() => alterna(dim, valor, false)}
                  aria-label={`Quitar filtro ${ETIQUETA_DIM[dim]}: ${etiquetaValor(dim, valor)}`}
                >
                  <span className="filtros-chip__dim">{ETIQUETA_DIM[dim]}</span>
                  {etiquetaValor(dim, valor)}
                  <X size={12} aria-hidden />
                </button>
              </li>
            )),
          )}
        </ul>
      )}

      {/* El parámetro actual queda accesible para lectores de pantalla y depuración. */}
      <p className="sr-only" aria-live="polite">
        {sp.size > 0 ? `Filtros activos: ${sp.toString()}` : 'Sin filtros.'}
      </p>
    </div>
  );
}
