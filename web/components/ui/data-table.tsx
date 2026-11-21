"use client"

// Tabla de datos con ordenación y paginación (patrón oficial shadcn/ui "data-table", MIT,
// sobre TanStack Table). Adaptada: encabezados ordenables y paginación simple en español.
import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "cn"

export function DataTable<TData>({
  columns,
  data,
  porPagina = 8,
  textoVacio = "No hay filas.",
  className,
}: {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  porPagina?: number
  textoVacio?: string
  className?: string
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: porPagina } },
  })

  const { pageIndex, pageCount } = {
    pageIndex: table.getState().pagination.pageIndex,
    pageCount: table.getPageCount(),
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="-m-1 inline-flex min-h-11 items-center gap-1 rounded px-1 font-medium hover:text-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="size-3.5" aria-label="ascendente" />
                        ) : h.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="size-3.5" aria-label="descendente" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                  {textoVacio}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            Página {pageIndex + 1} de {pageCount} · {data.length} filas
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
