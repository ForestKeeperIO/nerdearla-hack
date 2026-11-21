import { contextoReporte } from '@/lib/contexto-reporte';
import { csvReporte } from '@/lib/csv-reporte';
import { esAlcance } from '@/lib/informe';
import { esReporte } from '@/lib/reportes';
import { informeSeleccion } from '@/lib/reporte-seleccion';

export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{tipo:string}>}) {
  const {tipo}=await params, search=new URL(req.url).searchParams;
  const q=Object.fromEntries([...search.keys()].map(k=>[k,search.getAll(k).join(',')]));
  const {f,programa,municipio}=contextoReporte(q);
  if(!esReporte(tipo)||f.programa.some(p=>!esAlcance(p))||(municipio&&!/^\d{5}$/.test(municipio))) return new Response('No encontrado',{status:404});
  const r=await informeSeleccion(q);
  if(!r.disponible) return new Response('Sin detalle para esta selección',{status:503});
  return new Response(csvReporte(tipo,q,r),{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store',
    'Content-Disposition':`attachment; filename="EIRA-${tipo}-${programa}-${municipio||'general'}-${r.corte||'sin-corte'}.csv"`}});
}
