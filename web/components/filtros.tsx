'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { Filtros } from '@/lib/comun';

const DIMS: { clave: keyof Filtros; rotulo: string }[] = [
  { clave: 'programa', rotulo: 'Programa' },
  { clave: 'periodo', rotulo: 'Periodo' },
  { clave: 'ciudad', rotulo: 'Ciudad' },
  { clave: 'servicio', rotulo: 'Servicio' },
];

export function FiltrosBarra({
  opciones,
  activos,
}: {
  opciones: Record<keyof Filtros, string[]>;
  activos: Filtros;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [cargando, start] = useTransition();

  function cambiar(clave: keyof Filtros, valor: string) {
    const params = new URLSearchParams(sp.toString());
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    start(() => router.replace(`/tablero?${params.toString()}`));
  }

  const hayFiltros = Object.values(activos).some(Boolean);

  return (
    <section aria-label="Filtros" aria-busy={cargando} className="flex flex-wrap items-end gap-3">
      {DIMS.map((d) => (
        <label key={d.clave} className="flex flex-col gap-1">
          <span className="etiqueta">{d.rotulo}</span>
          <select
            value={activos[d.clave] ?? ''}
            onChange={(e) => cambiar(d.clave, e.target.value)}
            className="rounded-md border border-[var(--color-input)] bg-[var(--color-cotton)] px-3"
          >
            <option value="">Todos</option>
            {opciones[d.clave].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}
      {hayFiltros && (
        <button
          type="button"
          onClick={() => start(() => router.replace('/tablero'))}
          className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-[var(--color-accent-2)] underline hover:bg-[var(--color-paper-2)]"
        >
          Quitar filtros
        </button>
      )}
      {cargando && <span role="status" className="etiqueta">Actualizando…</span>}
    </section>
  );
}
