// Banner de aviso persistente (avisos que no se van solos, p. ej. "3 pares por decidir").
// Reimplementación propia del patrón "alert banner" de lavikatiyar en 21st.dev
// (licencia "unknown" en la página: no se copia su código ni se usa framer-motion).
import * as React from "react"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertaVariantes = cva(
  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variante: {
        info: "border-border bg-muted text-foreground",
        aviso: "border-amber-200 bg-[var(--estado-aviso-fondo)] text-[var(--estado-aviso)]",
        error: "border-red-200 bg-[var(--estado-error-fondo)] text-[var(--estado-error)]",
        listo: "border-emerald-200 bg-[var(--estado-listo-fondo)] text-[var(--estado-listo)]",
      },
    },
    defaultVariants: { variante: "info" },
  }
)

const ICONOS = {
  info: Info,
  aviso: TriangleAlert,
  error: CircleAlert,
  listo: CircleCheck,
} as const

export function Alerta({
  variante = "info",
  titulo,
  alCerrar,
  className,
  children,
}: {
  titulo?: string
  /** Si se pasa, muestra botón para cerrar el aviso. */
  alCerrar?: () => void
  className?: string
  children?: React.ReactNode
} & VariantProps<typeof alertaVariantes>) {
  const Icono = ICONOS[variante ?? "info"]
  return (
    <div role="status" data-slot="alert" className={cn(alertaVariantes({ variante }), className)}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className="text-current/90 [&_a]:underline">{children}</div>}
      </div>
      {alCerrar && (
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar aviso"
          className="-m-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-current/70 hover:text-current"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
