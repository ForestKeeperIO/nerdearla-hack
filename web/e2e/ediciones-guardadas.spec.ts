import { randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

test('una carga cambia la siguiente edición, nunca el PDF ni el CSV guardados',async({page},info)=>{
  test.skip(process.env.E2E_DEMO_AISLADO!=='1','Requiere motor, Valkey y base de reporte dedicados.');
  test.setTimeout(180000);
  const firma=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  async function descargar(p:Page,formato:'CSV'|'PDF',sufijo:string) {
    const espera=p.waitForEvent('download');
    await p.getByRole('link',{name:`Descargar ${formato}`,exact:true}).click();
    const d=await espera, ruta=info.outputPath(`${sufijo}-${d.suggestedFilename()}`);
    await d.saveAs(ruta);
    return {hash:firma(await readFile(ruta)),texto:formato==='CSV'?await readFile(ruta,'utf8'):
      execFileSync('pdftotext',['-layout',ruta,'-'],{encoding:'utf8'})};
  }
  async function generar(tipo:string) {
    await page.goto(`/reportes/${tipo}?programa=tamizaje-rosa`);
    await page.getByRole('button',{name:'Generar reporte',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Reporte guardado'})).toBeVisible({timeout:45000});
    const card=page.locator('.edicion').first();
    const href=await card.getByRole('link',{name:'Abrir'}).getAttribute('href');
    await card.getByRole('link',{name:'Abrir'}).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    return href!;
  }
  const primera=await generar('aliados');
  const personas=Number(await page.locator('.respuesta strong').innerText());
  const csv=await descargar(page,'CSV','primero'), pdf=await descargar(page,'PDF','primero');
  expect(csv.texto).toMatch(new RegExp(`"${personas}".*"personas_impactadas"`));
  expect(pdf.texto).toContain('Edición guardada');

  await page.goto('/subir');
  const elegir=page.getByRole('button',{name:'Elegir archivo',exact:true});
  await expect(elegir).toBeEnabled();
  const nonce=Array.from(randomBytes(3),n=>String.fromCharCode(65+n%26)).join('');
  const nombre=`atencion-ensayo-${nonce}.csv`, csvCarga=['ID,Nombre,Estudio,Edad,Ciudad,Asistencia,Fecha',
    ...['Luna','Sol','Mar','Luz','Alba','Cielo'].map((n,i)=>`${nonce}19800${i+1}01,${n} Prueba ${nonce},Papanicolaou,46,Tuxpan,Sí,2026-09-15`)].join('\n');
  const elegirArchivo=page.waitForEvent('filechooser');await elegir.click();
  await (await elegirArchivo).setFiles({name:nombre,mimeType:'text/csv',buffer:Buffer.from(csvCarga)});
  await page.getByRole('button',{name:'Subir 1 archivo'}).click();
  const recibo=page.locator('.fila').filter({hasText:nombre}).filter({hasText:'6 filas nuevas'});
  await expect(recibo).toContainText('0 omitidas, 0 pares',{timeout:35000});
  await expect(recibo).toContainText(/[1-5] \/ 5/);
  await page.goto('/reportes');
  const guardada=page.locator('.edicion').filter({has:page.locator(`a[href="${primera}"]`)});
  await expect(guardada).toContainText('Hay datos más nuevos que este reporte');
  await guardada.getByRole('link',{name:'Abrir'}).click();
  expect((await descargar(page,'CSV','despues')).hash).toBe(csv.hash);
  expect((await descargar(page,'PDF','despues')).hash).toBe(pdf.hash);
  await generar('aliados');
  await expect(page.locator('.respuesta strong')).toHaveText(String(personas+6));
  await page.goto('/reportes?origen=tablero&programa=tamizaje-rosa&municipio=14108');
  const territorial=page.locator('.tapa-mapa');
  await territorial.getByRole('button',{name:'Generar reporte'}).click();
  await expect(page.getByRole('status').filter({hasText:'Reporte guardado'})).toBeVisible({timeout:45000});
  await page.locator('.edicion').first().getByRole('link',{name:'Abrir'}).click();
  expect((await descargar(page,'CSV','territorial')).texto).toContain('"14108","Tuxpan"');
  expect((await descargar(page,'PDF','territorial')).texto).toContain('Tuxpan');
  console.log(`Corte guardado ${personas} → nueva edición ${personas+6}; PDF ${pdf.hash}, CSV ${csv.hash} idénticos tras la carga.`);
});
