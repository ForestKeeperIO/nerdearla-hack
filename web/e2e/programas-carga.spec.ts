import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('los programas llegan desde la carga al Tablero y a Reportes sin reasignar un nombre desconocido', async ({page, request}) => {
  test.skip(process.env.E2E_PROGRAMAS_AISLADO !== '1', 'Requiere una instancia vacía de Selma, con su propio Valkey y Atlas.');
  await page.goto('/reportes/aliados?programa=global');
  await expect(page.locator('select[name=programa] option[value=comunidades-de-origen]')).toHaveCount(0);
  await page.goto('/subir');
  const tarjetas = page.getByRole('navigation', {name:'Elegir programa de la carga'});
  await expect(page.getByRole('heading', {name:'¿De qué programa es este archivo?'})).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  for (const nombre of ['Tamizaje Rosa','Melenas en Movimiento','Salud que Florece','Cambiando las Reglas','Comunidades de Origen','Otro programa'])
    await expect(tarjetas.getByRole('link', {name:nombre, exact:true})).toBeVisible();
  await tarjetas.getByRole('link',{name:'Comunidades de Origen'}).click();
  await page.locator('input[type=file]').setInputFiles(resolve('..','reportes','nutricion.xlsx'));
  await page.getByRole('button',{name:'Conservar Comunidades de Origen'}).click();
  await page.getByRole('button',{name:'Subir 1 archivo'}).click();
  await expect(page.locator('.fila').filter({hasText:'nutricion.xlsx'})).toContainText(/Listo · [1-9]\d* filas nuevas/, {timeout:30000});
  const archivo = {name:'taller.csv', mimeType:'text/csv', buffer:Buffer.from(
    'ID,Nombre,Edad,Ciudad,Asistencia,Fecha\nABC19951201,Luna Ficticia,30,Tuxpan,Sí,2026-10-01')};
  await page.getByRole('link',{name:'Cambiar',exact:true}).click();
  await page.getByRole('link',{name:'Otro programa',exact:true}).click();
  await page.getByLabel('Nombre del programa').fill('Programa sin alta');
  await page.getByRole('combobox',{name:'Unidad',exact:true}).selectOption('participacion');
  await expect(page.getByText('Pide su alta', {exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Usar este programa'})).toBeDisabled();
  const rechazo = await request.post('/api/subir',{multipart:{archivo,programa:'otro',nombre_programa:'Programa sin alta',unidad:'participacion',fecha_corte:'2026-11-21'}});
  expect(rechazo.status()).toBe(422);
  await page.getByLabel('Nombre del programa').fill('Salud que Florece');
  await page.getByRole('button',{name:'Usar este programa'}).click();
  await page.locator('input[type=file]').setInputFiles(archivo);
  await page.getByRole('button',{name:'Subir 1 archivo'}).click();
  await expect(page).toHaveURL(/\/informe\/salud-que-florece\/subir$/);
  await expect(page.locator('.fila').filter({hasText:'taller.csv'})).toContainText('1 fila nueva', {timeout:30000});

  await page.goto('/tablero');
  const programa = page.getByRole('combobox',{name:'Programa',exact:true});
  await programa.fill('Comunidades');
  await programa.press('ArrowDown');
  await programa.press('Enter');
  await expect(page).toHaveURL(/programa=comunidades-de-origen/);
  await page.getByRole('link',{name:'Sacar reporte'}).click();
  for (const [i,tipo] of ['aliados','territorial'].entries()) {
    await page.getByRole('link',{name:'Leer reporte',exact:true}).nth(i).click();
    const selector = page.getByRole('combobox',{name:'Programa',exact:true});
    await expect(selector).toHaveValue('comunidades-de-origen');
    await expect(selector.locator('option[value=salud-que-florece]')).toHaveCount(1);
    await expect(selector.locator('option[value=cambiando-las-reglas]')).toHaveCount(0);
    const enlace = await page.getByRole('link',{name:'Descargar CSV'}).getAttribute('href');
    const csv = await request.get(enlace!);
    expect(csv.ok()).toBe(true);
    expect(await csv.text()).toMatch(/"atencion".*"comunidades-de-origen","actividad"/);
    expect(enlace).toContain(`/reportes/${tipo}/`);
    await page.getByRole('link',{name:'Reportes generados',exact:true}).click();
  }
});
