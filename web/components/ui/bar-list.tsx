// Lista de barras horizontales para valores rankeados (desglose por ciudad).
// La página del benchmark ("bar-list" de sltowl en 21st.dev) ya no existe (404):
// sustituida por esta implementación propia sobre Tailwind, patrón de lista con barra.
import { cn } from "cn"

export type BarraItem = {
  nombre: string
  /** Valor numérico para la proporción de la barra. */
  valor: number
  /** Texto a mostrar a la derecha (p. ej. "<5" para cifras menores a 5). */
  texto?: string
}

export function BarList({
  datos,
  className,
}: {
  datos: BarraItem[]
  className?: string
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <ul className={cn("flex flex-col", className)}>
      {datos.map((d) => (
        <li
          key={d.nombre}
          className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 border-t border-border py-2.5 first:border-t-0"
        >
          <span className="truncate text-sm">{d.nombre}</span>
          <span className="h-2.5 min-w-8 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-[var(--rosa)]"
              style={{ width: `${Math.max(2, (d.valor / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-sm font-semibold tabular-nums">
            {d.texto ?? d.valor.toLocaleString("es-MX")}
          </span>
        </li>
      ))}
    </ul>
  )
}
