import { idValido } from '@/lib/archivo-reportes';
import { reporteGuardado } from '@/lib/claves';
import { valkey } from '@/lib/valkey';

export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{id:string;formato:string}>}) {
  const {id,formato}=await params;
  if(!idValido(id)||(formato!=='pdf'&&formato!=='csv')) return new Response('No encontrado',{status:404});
  const bytes=await valkey().hgetBuffer(reporteGuardado(id),formato);
  if(!bytes) return new Response('Archivo no encontrado',{status:404});
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':formato==='pdf'?'application/pdf':'text/csv; charset=utf-8',
    'Content-Disposition':`attachment; filename="EIRA-${id}.${formato}"`,'Cache-Control':'private, max-age=31536000, immutable'}});
}
