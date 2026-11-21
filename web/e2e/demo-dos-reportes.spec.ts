import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

// Copia desechable del demo, con su propio trabajador y sin una carga previa en Tonalá.
test('la carga llega al mapa abierto y a los dos documentos de la selección', async ({page,context}, info) => {
  test.skip(process.env.E2E_DEMO_AISLADO !== '1', 'No subir datos al entorno compartido.');
  await page.goto('/tablero');
  const personas=page.locator('[data-kpi=personas]');
  const total=Number(await personas.innerText());
  const programa=page.getByRole('combobox',{name:'Programa',exact:true});
  await programa.focus(); await programa.press('ArrowDown'); await programa.pressSequentially('tamizaje'); await programa.press('Enter');
  await expect(page).toHaveURL(/programa=tamizaje-rosa/);
  await programa.press('Escape');
  await expect(personas).not.toHaveText(String(total));
  await page.locator('summary').filter({hasText:'Periodo'}).click();
  await page.getByRole('button',{name:'Último mes'}).click();
  await expect(page).toHaveURL(/desde=2026-09&hasta=2026-09/);
  const antes=Number(await personas.innerText());
  const municipios=page.locator('[data-kpi=municipios]');
  const lugares=Number(await municipios.innerText());
  const punto=page.getByRole('link',{name:/Filtrar Tonalá:/});
  await expect(punto).toHaveCount(0);
  await page.evaluate(()=>{document.documentElement.dataset.ensayo='abierto';});

  const carga=await context.newPage();
  await carga.goto('/subir');
  await carga.getByRole('link',{name:/Tamizaje Rosa/}).click();
  const nombre='atencion-demo-tonala.csv';
  const filas=['Sol','Luna','Mar','Alba','Luz','Cielo'].map((n,i)=>
    `TST19800${i+1}01,${n} Ficticia Demo,Papanicolaou,46,Tonalá,Sí,2026-09-15`);
  await carga.locator('input[type=file]').setInputFiles({name:nombre,mimeType:'text/csv',
    buffer:Buffer.from(['ID,Nombre,Estudio,Edad,Ciudad,Asistencia,Fecha',...filas].join('\n'))});
  await carga.getByRole('button',{name:'Subir 1 archivo'}).click();
  const recibo=carga.locator('.fila').filter({hasText:nombre}).filter({hasText:'6 filas nuevas'});
  await expect(recibo).toContainText('0 omitidas, 0 pares detectados',{timeout:35000});
  await expect(recibo).toContainText(/[1-5] \/ 5/);
  await page.bringToFront();
  await expect(personas).toHaveText(String(antes+6),{timeout:25000});
  await expect(municipios).toHaveText(String(lugares+1));
  await expect(page.locator('html')).toHaveAttribute('data-ensayo','abierto');
  await expect(page.locator('.bento-cargas li').filter({hasText:nombre}).locator('[aria-label$="estrellas"]')).toBeVisible();
  await punto.click();
  await expect(page).toHaveURL(/municipio=14101/);
  await expect(personas).toHaveText('6');
  await page.getByRole('link',{name:'Sacar reporte'}).click();
  const catalogo=page.url();
  for (const [i,tipo] of ['aliados','territorial'].entries()) {
    await page.getByRole('link',{name:'Leer reporte',exact:true}).nth(i).click();
    await expect(page.locator('.seleccion-publicada')).toContainText('14101');
    for (const formato of ['CSV','PDF']) {
      const espera=page.waitForEvent('download');
      await page.getByRole('link',{name:`Descargar ${formato}`,exact:true}).click();
      const descarga=await espera, ruta=info.outputPath(descarga.suggestedFilename());
      await descarga.saveAs(ruta);
      const texto=formato==='CSV' ? await readFile(ruta,'utf8') : execFileSync('pdftotext',['-layout',ruta,'-'],{encoding:'utf8'});
      expect(texto).toContain('Tonalá'); expect(texto).toContain('14101'); expect(texto).not.toContain('Jocotepec');
      if (formato==='CSV') {
        expect(texto).toMatch(/"Tonalá","Papanicolaou","atencion","","6"/);
        if (tipo==='aliados') expect(texto).toMatch(/"6".*"personas_impactadas"/);
      } else expect(texto).toContain('SICAM/DGIS');
    }
    await page.goto(catalogo);
  }
  console.log(`Personas ${antes} → ${antes+6}; municipios ${lugares} → ${lugares+1}. ${await recibo.innerText()}`);
});
