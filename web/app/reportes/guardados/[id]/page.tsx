import { notFound } from 'next/navigation';
import { HojaReporte } from '@/components/hoja-reporte';
import { leerEdicion } from '@/lib/archivo-reportes';

export const dynamic='force-dynamic';
export default async function Guardado({params}:{params:Promise<{id:string}>}) {
  const edicion=await leerEdicion((await params).id);
  if(!edicion) notFound();
  const {portada,informe}=edicion;
  return <HojaReporte tipo={portada.tipo} r={informe} q={Object.fromEntries(new URLSearchParams(portada.consulta))} guardada={portada}/>;
}
