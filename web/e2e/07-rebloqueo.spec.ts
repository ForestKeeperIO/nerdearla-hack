// Caso 7: subir un archivo nuevo a un programa vuelve a bloquear Vista previa
// y Exportar de ese programa y del Global.
import { expect, test } from '@playwright/test';
import { semilla, valkey, xlsxMinimo } from './ayudas';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

test.beforeEach(() => {
  semilla();
});

test('un archivo nuevo rebloquea Vista previa y Exportar del programa y del Global', async ({
  page,
}) => {
  // Preparación: los dos informes ya revisados (estado previo a la nueva subida).
  const v = valkey();
  try {
    await v.hset('eira:informe:tamizaje-rosa', 'calidad_resuelta', '1', 'cifras_aprobadas', '1');
    await v.hset('eira:informe:global', 'calidad_resuelta', '1', 'cifras_aprobadas', '1');
  } finally {
    v.disconnect();
  }

  // Antes de la subida, Exportar sí abre.
  await page.goto('/informe/tamizaje-rosa/exportar');
  await expect(page.getByRole('heading', { name: 'Exportar informe' })).toBeVisible();

  // Subir un archivo nuevo por la interfaz.
  await page.goto('/informe/tamizaje-rosa/subir');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'atenciones-nuevas.xlsx',
    mimeType: XLSX_MIME,
    buffer: xlsxMinimo([['Nombre', 'Edad'], ['D E F', '35']]),
  });
  await page.getByRole('button', { name: /Subir 1 archivo/ }).click();
  await expect(page.getByText('Recibido')).toBeVisible();

  // Vista previa y Exportar del programa vuelven a bloquearse (redirigen).
  await page.goto('/informe/tamizaje-rosa/vista-previa');
  await expect(page).not.toHaveURL(/\/informe\/tamizaje-rosa\/vista-previa/);
  await page.goto('/informe/tamizaje-rosa/exportar');
  await expect(page).not.toHaveURL(/\/informe\/tamizaje-rosa\/exportar/);

  // Lo mismo para el Global.
  await page.goto('/informe/global/vista-previa');
  await expect(page).toHaveURL(/\/informe\/global\/calidad/);
  await page.goto('/informe/global/exportar');
  await expect(page).toHaveURL(/\/informe\/global\/calidad/);
});
