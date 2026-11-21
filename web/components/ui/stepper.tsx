"use client"

// Stepper accesible de varios pasos (completo / actual / próximo, triggers clicables).
// Reimplementación propia del patrón del componente "stepper" de kevingirelli en 21st.dev
// (licencia MIT declarada en la página, pero el código fuente no es visible sin API key).
import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "cn"

export type PasoStepper = {
  id: string
  titulo: string
  descripcion?: string
}

export function Stepper({
  pasos,
  actual,
  onSeleccionar,
  className,
}: {
  pasos: PasoStepper[]
  /** Índice del paso actual (0-based). Los anteriores se marcan completos. */
  actual: number
  onSeleccionar?: (indice: number) => void
  className?: string
}) {
  return (
    <nav aria-label="Progreso" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {pasos.map((paso, i) => {
          const completo = i < actual
          const vigente = i === actual
          const ultimo = i === pasos.length - 1
          return (
            <li key={paso.id} className={cn("flex items-center", !ultimo && "flex-1")}>
              <button
                type="button"
                onClick={() => onSeleccionar?.(i)}
                aria-current={vigente ? "step" : undefined}
                aria-label={`Paso ${i + 1}: ${paso.titulo}${completo ? " (completo)" : vigente ? " (actual)" : ""}`}
                className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
                    completo && "border-primary bg-primary text-primary-foreground",
                    vigente && "border-primary bg-background text-primary ring-2 ring-primary/25",
                    !completo && !vigente && "border-input bg-background text-muted-foreground"
                  )}
                >
                  {completo ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden flex-col sm:flex">
                  <span
                    className={cn(
                      "text-sm font-medium whitespace-nowrap",
                      vigente ? "text-foreground" : completo ? "text-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {paso.titulo}
                  </span>
                  {paso.descripcion && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{paso.descripcion}</span>
                  )}
                </span>
              </button>
              {!ultimo && (
                <span
                  aria-hidden="true"
                  className={cn("mx-2 h-px min-w-4 flex-1", completo ? "bg-primary" : "bg-border")}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
