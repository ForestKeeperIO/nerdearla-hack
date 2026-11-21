import { notFound } from 'next/navigation';
import { HojaReporte } from '@/components/hoja-reporte';
import { contextoReporte } from '@/lib/contexto-reporte';
import { esAlcance } from '@/lib/informe';
import { esReporte } from '@/lib/reportes';
import { informeSeleccion } from '@/lib/reporte-seleccion';

export const dynamic='force-dynamic';
export default async function Plantilla({params,searchParams}:PageProps<'/reportes/[tipo]'>) {
  const {tipo}=await params, q=await searchParams;
  if(!esReporte(tipo)||contextoReporte(q).f.programa.some(p=>!esAlcance(p))) notFound();
  return <HojaReporte tipo={tipo} q={q} r={await informeSeleccion(q)}/>;
}
