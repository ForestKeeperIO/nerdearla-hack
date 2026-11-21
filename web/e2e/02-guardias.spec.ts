// Caso 2: no se puede saltar pasos — entrar por URL a calidad, vista previa o
// exportar de un programa sin archivos redirige al paso que toca, y el
// indicador de pasos muestra los bloqueados como no navegables.
import { expect, test } from '@playwright/test';
import { limpiar } from './ayudas';

const ALCANCE = 'tamizaje-rosa';

test.beforeEach(async () => {
  await limpiar();
});

for (const paso of ['calidad', 'vista-previa', 'exportar']) {
  test(`abrir /informe/${ALCANCE}/${paso} sin archivos redirige`, async ({ page }) => {
    await page.goto(`/informe/${ALCANCE}/${paso}`);
    await expect(page).toHaveURL(new RegExp(`/informe/${ALCANCE}/subir$`));
    await expect(page.getByRole('heading', { name: 'Subir archivos' })).toBeVisible();
  });
}

test('el indicador de pasos muestra los bloqueados con motivo y sin enlace', async ({ page }) => {
  await page.goto(`/informe/${ALCANCE}/subir`);

  const nav = page.getByRole('navigation', { name: 'Pasos del informe' });
  await expect(nav).toBeVisible();
  await expect(nav.getByText('Subir')).toBeVisible();
  await expect(nav.getByText('Calidad')).toBeVisible();
  await expect(nav.getByText('Vista previa')).toBeVisible();
  await expect(nav.getByText('Exportar')).toBeVisible();

  // Los tres pasos bloqueados dicen el motivo y no son navegables (no hay enlaces).
  await expect(nav.getByText('Primero sube al menos un archivo.')).toHaveCount(3);
  await expect(nav.locator('a')).toHaveCount(0);

  // El paso actual está marcado.
  await expect(nav.locator('[aria-current="step"]')).toContainText('Subir');
});
