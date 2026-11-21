import { imprimirRuta } from '@/lib/pdf-reporte';
import { contextoReporte } from '@/lib/contexto-reporte';
import { esReporte } from '@/lib/reportes';
import { esAlcance } from '@/lib/informe';

export const dynamic='force-dynamic';
let ocupado=false;

export async function GET(request:Request,{params}:{params:Promise<{tipo:string}>}) {
  const {tipo}=await params, search=new URL(request.url).searchParams;
  const q=Object.fromEntries([...search.keys()].map(k=>[k,search.getAll(k).join(',')]));
  const c=contextoReporte(q);
  if (!esReporte(tipo) || c.f.programa.some(p=>!esAlcance(p))) return new Response('No encontrado',{status:404});
  if (ocupado) return new Response('Hay otro PDF en preparación. Intenta de nuevo en unos segundos.',{status:429,headers:{'Retry-After':'3'}});
  ocupado=true;
  try {
    const pdf=await imprimirRuta(`/reportes/${tipo}?${c.params}`);
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store',
      'Content-Disposition':`attachment; filename="EIRA-${tipo}-${c.programa}.pdf"`}});
  } catch {
    return new Response('No se pudo generar el PDF. Vuelve al reporte y elige Imprimir o guardar PDF.',{status:503});
  } finally {ocupado=false;}
}
