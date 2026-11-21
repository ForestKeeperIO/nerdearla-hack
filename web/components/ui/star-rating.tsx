// Calificación en estrellas, solo lectura, con relleno parcial.
// Reimplementación propia del patrón del componente "star-rating" de shadcncraft en 21st.dev
// (licencia Apache-2.0 declarada en la página, pero el código fuente no es visible sin API key).
import { Star } from "lucide-react"
import { cn } from "cn"

export function StarRating({
  valor,
  max = 5,
  etiqueta,
  className,
}: {
  /** Calificación, admite fracciones (p. ej. 3.5). */
  valor: number
  max?: number
  /** Texto visible junto a las estrellas (p. ej. "3.5 / 5"). */
  etiqueta?: string
  className?: string
}) {
  const acotado = Math.max(0, Math.min(max, valor))
  const porcentaje = (acotado / max) * 100
  const fila = (llena: boolean) => (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            llena ? "fill-primary text-primary" : "fill-transparent text-input"
          )}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        role="img"
        aria-label={`${etiqueta ?? `${acotado} de ${max} estrellas`}`}
        className="relative inline-flex shrink-0"
      >
        {fila(false)}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${porcentaje}%` }}
        >
          {fila(true)}
        </span>
      </span>
      {etiqueta && <span className="text-sm font-medium text-muted-foreground tabular-nums">{etiqueta}</span>}
    </span>
  )
}
