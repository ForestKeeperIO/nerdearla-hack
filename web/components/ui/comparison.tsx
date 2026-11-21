// Comparación lado a lado de dos registros con divisor "VS" y desglose por filas.
// Reimplementación propia del patrón del componente "comparison" de muneebable en 21st.dev
// (licencia "unknown" en la página: no se copia su código ni se usa framer-motion).
import * as React from "react"
import { cn } from "cn"

export type LadoComparacion = {
  titulo: string
  subtitulo?: string
  filas?: { rotulo: string; valor: string }[]
}

function Lado({ lado }: { lado: LadoComparacion }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/40 p-4">
      <p className="font-medium">{lado.titulo}</p>
      {lado.subtitulo && <p className="mt-0.5 text-sm text-muted-foreground">{lado.subtitulo}</p>}
      {lado.filas && lado.filas.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {lado.filas.map((f, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-3 border-t border-border py-1.5 text-sm first:border-t-0"
            >
              <span className="text-muted-foreground">{f.rotulo}</span>
              <span className="font-medium tabular-nums">{f.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Comparison({
  a,
  b,
  motivo,
  acciones,
  className,
}: {
  a: LadoComparacion
  b: LadoComparacion
  /** Por qué el sistema juntó a estos dos registros. */
  motivo?: string
  /** Botones de decisión (p. ej. "Es la misma persona" / "Son dos personas"). */
  acciones?: React.ReactNode
  className?: string
}) {
  return (
    <article
      data-slot="comparison"
      className={cn("rounded-lg border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-card)]", className)}
    >
      {motivo && <p className="mb-3 text-sm text-muted-foreground">{motivo}</p>}
      <div className="relative grid gap-3 sm:grid-cols-2">
        <Lado lado={a} />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-[0.65rem] font-bold tracking-wider text-muted-foreground sm:flex"
        >
          VS
        </span>
        <Lado lado={b} />
      </div>
      {acciones && <div className="mt-4 flex flex-wrap gap-3">{acciones}</div>}
    </article>
  )
}
