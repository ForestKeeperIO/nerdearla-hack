import { expect, test } from '@playwright/test';

// Requiere Valkey y SQLite recién inicializados y un trabajador real dedicado.
// No activar contra la vista previa ni contra una base de uso compartido.
test('una carga terminada cambia la pestaña abierta y mantiene la selección del reporte', async ({ page, context }) => {
  test.skip(process.env.E2E_TABLERO_AISLADO !== '1', 'Solo con el motor y ambas bases aislados.');
  await page.goto('/tablero?programa=tamizaje-rosa&desde=2026-09&hasta=2026-09');
  await expect(page.locator('[data-kpi=personas]')).toHaveText('0');
  const url = page.url();
  await page.evaluate(() => { document.documentElement.dataset.sesionDemo = 'continua'; });
  const carga = await context.newPage();
  await carga.goto('/subir');
  const fecha = carga.locator('[name=fecha_corte]');
  if (await fecha.count()) {
    await fecha.fill('2026-09-30');
    await carga.getByRole('button',{name:'Guardar fecha de corte'}).click();
    await expect(fecha).toHaveCount(0);
  }
  for (const [i,municipio] of ['Zapopan','Guadalajara'].entries()) {
    const nombre = `jornada-ficticia-${i+1}.csv`;
    const csv = `ID,Nombre,Estudio,Edad,Ciudad,Asistencia,Fecha\n`+
      ['Luna','Estrella','Sol','Mar','Cielo','Alba'].map((n,j) =>
        `TE${i===0?'A':'B'}19800${j+1}01,${n} Prueba ${i===0?'Uno':'Dos'},Papanicolaou,46,${municipio},Sí,2026-09-15`).join('\n');
    await carga.locator('input[type=file]').setInputFiles({name:nombre,mimeType:'text/csv',buffer:Buffer.from(csv)});
    const estado = carga.getByRole('combobox',{name:'Estado de las ciudades'});
    await estado.focus(); await estado.press('ArrowDown'); await estado.pressSequentially('jalis'); await estado.press('Enter');
    const tipo = carga.getByRole('combobox',{name:'Tipo de registro'});
    await tipo.focus(); await tipo.press('ArrowDown'); await tipo.pressSequentially('atencion'); await tipo.press('Enter');
    await carga.getByRole('button',{name:/Subir \d|Enviar|Subir archivo/}).last().click();
    await expect(carga.locator('.fila').filter({hasText:nombre}).filter({hasText:/filas contadas/})).toBeVisible({timeout:30000});
    await page.bringToFront();
    await expect(page.locator('[data-kpi=personas]')).toHaveText(String((i+1)*6),{timeout:20000});
    await expect(page.locator('[data-kpi=municipios]')).toHaveText(String(i+1));
    await expect(page.getByRole('link',{name:new RegExp(`Filtrar ${municipio}:`)})).toBeVisible();
    await expect(page.locator('.bento-cargas li').filter({hasText:nombre}).locator('[aria-label$="estrellas"]')).toBeVisible();
    await expect(page).toHaveURL(url);
    expect(await page.locator('html').getAttribute('data-sesion-demo')).toBe('continua');
  }
  await page.getByRole('link',{name:'Sacar reporte'}).click();
  await expect(page).toHaveURL(/\/reportes\?programa=tamizaje-rosa&desde=2026-09&hasta=2026-09/);
});
