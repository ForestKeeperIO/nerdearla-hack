import { chromium } from 'playwright-core';
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
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.EIRA_CHROMIUM || undefined,headless:true});
    const page=await browser.newPage();
    // El navegador solo puede visitar el propio servidor, no el Host de la petición.
    const origin=`http://127.0.0.1:${Number(process.env.PORT)||3000}`;
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(`${origin}/reportes/${tipo}?${c.params}`,{waitUntil:'load',timeout:20000});
    if (!response?.ok()) throw new Error('Reporte no disponible');
    await page.locator('.ficha-metodo').waitFor({timeout:8000});
    await page.evaluate(()=>document.fonts.ready);
    const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store',
      'Content-Disposition':`attachment; filename="EIRA-${tipo}-${c.programa}.pdf"`}});
  } catch {
    return new Response('No se pudo generar el PDF. Vuelve al reporte y elige Imprimir o guardar PDF.',{status:503});
  } finally {try {await browser?.close();} finally {ocupado=false;}}
}
