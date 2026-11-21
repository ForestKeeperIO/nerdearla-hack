import { chromium } from 'playwright-core';

export async function imprimirRuta(ruta:string) {
  const origin=`http://127.0.0.1:${Number(process.env.PORT)||3000}`;
  const browser=await chromium.launch({executablePath:process.env.EIRA_CHROMIUM||undefined,headless:true});
  try {
    const page=await browser.newPage();
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin+ruta,{waitUntil:'load',timeout:30000});
    if(!response?.ok()) throw new Error('Reporte no disponible');
    await page.locator('.ficha-metodo').waitFor({timeout:10000});
    await page.evaluate(()=>document.fonts.ready);
    return await page.pdf({preferCSSPageSize:true,printBackground:true});
  } finally {await browser.close();}
}
