'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { Anomalia } from '@/lib/comun';

type Fila = Anomalia & { reglaTexto: string };

const columnas: ColumnDef<Fila, unknown>[] = [
  {
    accessorKey: 'fila',
    header: 'Fila',
    cell: ({ getValue }) => <span className="mono">{String(getValue())}</span>,
  },
  { accessorKey: 'reglaTexto', header: 'Problema' },
  {
    accessorKey: 'campo',
    header: 'Campo',
    cell: ({ getValue }) => String(getValue() ?? '') || <span className="text-muted-foreground">(fila completa)</span>,
  },
  { accessorKey: 'detalle', header: 'Detalle' },
];

export function TablaAnomalias({
  anomalias,
  reglas,
}: {
  anomalias: Anomalia[];
  reglas: Record<string, string>;
}) {
  const datos: Fila[] = anomalias.map((a) => ({
    ...a,
    reglaTexto: reglas[a.regla] ?? a.regla,
  }));
  return <DataTable columns={columnas} data={datos} textoVacio="Sin problemas en este archivo." />;
}
