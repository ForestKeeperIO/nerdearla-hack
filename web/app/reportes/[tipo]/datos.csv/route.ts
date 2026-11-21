import { esAlcance } from '@/lib/informe';
import { esReporte, leerReporte } from '@/lib/reportes';

export const dynamic = 'force-dynamic';
type Celda = number | string;

function csv(c: Celda) {
  let s = String(c);
  if (/^\s*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"','""')}"`;
}
const publicar = (n:number) => n>0 && n<5 ? '<5' : n;

export async function GET(req:Request,{params}:{params:Promise<{tipo:string}>}) {
  const {tipo} = await params;
  const q = new URL(req.url).searchParams, p = q.get('programa') || 'tamizaje-rosa';
  if (!esReporte(tipo) || !esAlcance(p)) return new Response('No encontrado',{status:404});
  const r = await leerReporte(p), mun = tipo==='territorial' ? q.get('mun') : null;
  if (mun && !r.municipios.some(m=>m.clave===mun)) return new Response('Municipio no encontrado',{status:404});
  const fuentes = r.fuentes.map(f=>f.nombre).join('; ');
  const filas:Celda[][] = [['cve_mun','municipio','servicio','unidad','grupo_edad','numerador','denominador','tasa','fecha_corte','fuente','version','programa','indicador']];
  function fila(c:Celda[],programa:string,indicador:string,origen=fuentes) { filas.push([...c,r.corte,origen,r.version,programa,indicador]); }
  if (r.fuentes.length) {
    for (const l of r.lineas.filter(l=>!mun || l.cve===mun)) fila([l.cve,l.municipio,l.servicio,l.unidad,'',publicar(l.n),'',''],l.programa,'actividad');
    if (tipo==='territorial') for (const m of r.municipios.filter(m=>!mun || m.clave===mun)) {
      fila([m.clave,m.municipio,'','registro','',publicar(m.n),'',''],p,'presencia');
      if (m.poblacion!==undefined) fila([m.clave,m.municipio,'Papanicolaou','mujeres','25-64','',m.poblacion,''],p,'poblacion_objetivo','INEGI, Censo 2020, ITER Jalisco');
    }
    if (tipo==='aliados') {
      fila(['','','','persona','',publicar(r.impactadas),'',''],p,'personas_impactadas');
      fila(['','','','persona','',publicar(r.donantes),'',''],p,'donantes');
      for (const g of r.edad.grupos) fila(['','','','persona',g.label,publicar(g.n),'',''],p,'personas_por_edad');
      fila(['','','','persona','Sin edad',publicar(r.edad.sin),'',''],p,'personas_sin_edad');
    }
  }
  return new Response('\uFEFF'+filas.map(f=>f.map(csv).join(',')).join('\r\n')+'\r\n',{headers:{
    'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="EIRA-${tipo}-${p}-${mun||'general'}-${r.corte||'sin-corte'}.csv"`,'Cache-Control':'no-store',
  }});
}
