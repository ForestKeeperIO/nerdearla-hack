import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('corrige el programa de un Excel sin perder el archivo ni enviarlo antes de confirmar', async ({ page }) => {
  test.skip(process.env.E2E_PROGRAMAS_AISLADO !== '1', 'Necesita Selma con Valkey y SQLite privados.');
  const envios: string[] = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/subir')) envios.push(r.url()); });
  await page.goto('/subir');
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Tamizaje Rosa', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles(resolve('..', 'reportes', 'melenas-en-movimiento.xlsx'));
  await expect(page.getByText('Este archivo parece de Melenas en Movimiento. ¿Cambiar?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Subir 1 archivo' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cambiar a Melenas en Movimiento' }).click();
  await expect(page).toHaveURL(/\/melenas-en-movimiento\/subir$/);
  await expect(page.getByText('melenas-en-movimiento.xlsx', { exact: true }).first()).toBeVisible();
  expect(envios).toHaveLength(0);
  await page.getByRole('button', { name: 'Subir 1 archivo' }).click();
  await expect(page.locator('.fila').filter({ hasText:'melenas-en-movimiento.xlsx' })).toContainText(/Listo · \d+ filas nuevas/, { timeout: 25000 });
  expect(envios).toHaveLength(1);
});

test('explica el error de Selma y abre el selector para un archivo corregido', async ({ page }) => {
  test.skip(process.env.E2E_PROGRAMAS_AISLADO !== '1', 'Necesita Selma con Valkey y SQLite privados.');
  await page.goto('/informe/tamizaje-rosa/subir');
  await page.locator('input[type=file]').setInputFiles({ name:'sin-filas.csv', mimeType:'text/csv', buffer:Buffer.from('Nombre,Fecha,ID\n') });
  await page.getByRole('button', { name: 'Subir 1 archivo' }).click();
  const recibo = page.locator('.fila').filter({ hasText:'sin-filas.csv' }).last();
  await expect(recibo).toContainText('Agrega al menos una fila con datos', { timeout: 25000 });
  const [selector] = await Promise.all([page.waitForEvent('filechooser'), recibo.getByRole('button', { name:'Volver a subir' }).click()]);
  await selector.setFiles({ name:'corregido.csv', mimeType:'text/csv', buffer:Buffer.from('Nombre,Fecha,Movimiento\nPersona Ficticia,2026-10-01,Donación de trenza') });
  await page.getByRole('button', { name:'Conservar Tamizaje Rosa' }).click();
  await expect(page.getByRole('button', { name: 'Subir 1 archivo' })).toBeEnabled();
});
