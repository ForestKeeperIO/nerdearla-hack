// Calificación de 1 a 5 estrellas, solo lectura: llenas en tinta, vacías en línea.
import { Star } from "lucide-react"
import { cn } from "cn"

export function StarRating({
  valor,
  max = 5,
  etiqueta,
  className,
}: {
  /** Calificación entera de 1 a 5. */
  valor: number
  max?: number
  /** Texto visible junto a las estrellas (p. ej. "3 / 5"). */
  etiqueta?: string
  className?: string
}) {
  const acotado = Math.max(0, Math.min(max, Math.round(valor)))
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        role="img"
        aria-label={etiqueta ?? `${acotado} de ${max} estrellas`}
        className="inline-flex shrink-0 gap-0.5"
      >
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "size-4",
              i < acotado
                ? "estrella-llena fill-[var(--vino)] text-[var(--vino)]"
                : "estrella-vacia fill-transparent text-[var(--linea-fuerte)]"
            )}
            strokeWidth={1.5}
          />
        ))}
      </span>
      {etiqueta && (
        <span className="text-sm font-medium text-[var(--tinta-tenue)] tabular-nums">{etiqueta}</span>
      )}
    </span>
  )
}
