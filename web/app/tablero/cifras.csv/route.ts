import { NextRequest } from 'next/server';
import { CAMPOS, periodoTexto, resumenCampo, seleccionDe } from '@/lib/seleccion-tablero';
import { leerTablero } from '@/lib/tablero-impacto';

export const dynamic = 'force-dynamic';

function celda(valor: string | number | null) {
  const s = String(valor ?? '');
  return `"${(/^[\s]*[=+\-@]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const f = seleccionDe(Object.fromEntries([...q.keys()].map(k => [k, q.getAll(k).join(',')])));
  const d = leerTablero(f);
  const rows = [
    ['Corte', d.corte], ...CAMPOS.map(k => [k, f[k].length ? f[k].map(v =>
      resumenCampo(k, { ...f, [k]: [v] }, d.opciones)).join('; ') : 'Todos']),
    ['Periodo', periodoTexto(f)], [],
    ['Indicador', 'Valor'], ['Personas impactadas por programa', d.personas], ['Edad promedio (años)', d.edad],
    ['Municipios con presencia', d.municipios], ...(d.conDonantes ? [['Donantes', d.donantes]] : []), [],
    ['Desglose', 'Categoría', 'Valor', 'Unidad'],
    ...d.lugares.map(x => ['Municipio', `${x.clave} ${x.nombre}`, x.n, 'registros']),
    ...d.edades.map(x => ['Edad', x.nombre, x.n, 'personas']),
    ...d.servicios.map(x => ['Servicio', x.nombre, x.n, 'registros']),
    ...d.meses.map(x => ['Mes', x.nombre, x.n, 'registros']),
  ];
  return new Response('\uFEFF' + rows.map(r => r.map(celda).join(',')).join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="tablero-eira.csv"' },
  });
}
