// Tarjeta de cifra (KPI) con estados cargando / vacío / error / lleno.
// La página del benchmark ("stat-card" de konsstepnov en 21st.dev) ya no existe (404):
// sustituida por esta implementación propia sobre la Card oficial de shadcn/ui (MIT).
// Regla del proyecto: sin deltas ni minigráficas si no hay dato real detrás.
import * as React from "react"
import { cn } from "cn"
import { Skeleton } from "@/components/ui/skeleton"

export function StatCard({
  titulo,
  valor,
  descripcion,
  pie,
  estado = "lleno",
  className,
  children,
}: {
  titulo: string
  /** Cifra ya formateada (o nodo, p. ej. un rango "entre X y Y"). */
  valor?: React.ReactNode
  descripcion?: React.ReactNode
  /** Contenido al pie de la tarjeta (p. ej. el desplegable "Cómo se calculó"). */
  pie?: React.ReactNode
  estado?: "lleno" | "cargando" | "vacio" | "error"
  className?: string
  children?: React.ReactNode
}) {
  return (
    <article
      data-slot="stat-card"
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-card)]",
        className
      )}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{titulo}</h3>
      {estado === "cargando" && (
        <>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-40" />
        </>
      )}
      {estado === "vacio" && <p className="text-sm text-muted-foreground">Sin datos todavía.</p>}
      {estado === "error" && <p className="text-sm text-destructive">No se pudo calcular esta cifra.</p>}
      {estado === "lleno" && (
        <>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
          {descripcion && <div className="text-sm text-muted-foreground">{descripcion}</div>}
          {children}
        </>
      )}
      {pie && <div className="mt-auto pt-2">{pie}</div>}
    </article>
  )
}
