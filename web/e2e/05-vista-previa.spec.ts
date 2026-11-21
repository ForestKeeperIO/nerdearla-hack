// Caso 5: Vista previa — "Las cifras son correctas" abre Exportar; Melenas
// muestra donantes y beneficiarias por separado; el Global muestra la suma
// de los programas y el dato de personas en más de un programa.
import { expect, test } from '@playwright/test';
import { semilla } from './ayudas';

test.beforeEach(() => {
  semilla();
});

test('Melenas muestra donantes y beneficiarias por separado', async ({ page }) => {
  await page.goto('/informe/melenas-en-movimiento/calidad');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect(page).toHaveURL(/\/informe\/melenas-en-movimiento\/vista-previa/);

  // Donaciones de trenza: donantes aparte, no cuentan como impactadas.
  await expect(page.getByText('donaciones recibidas')).toBeVisible();
  await expect(page.getByText('55 donantes')).toBeVisible();
  await expect(page.getByText('no cuentan como personas impactadas')).toBeVisible();

  // Entregas de peluca: beneficiarias que sí cuentan.
  await expect(page.getByText('productos entregados')).toBeVisible();
  await expect(page.getByText('18 beneficiarias')).toBeVisible();

  // Los tipos nunca se suman entre sí y la página lo dice.
  await expect(page.getByText('no se suman entre sí')).toBeVisible();

  // Personas impactadas: solo las beneficiarias (18), con rango por sin identificar.
  await expect(page.locator('.cifra').first()).toContainText('18');

  await page.getByRole('button', { name: 'Las cifras son correctas' }).click();
  await expect(page).toHaveURL(/\/informe\/melenas-en-movimiento\/exportar/);
});

test('Global muestra la suma de los programas y personas en más de uno', async ({ page }) => {
  await page.goto('/informe/global/calidad');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect(page).toHaveURL(/\/informe\/global\/vista-previa/);

  // La suma: 100 beneficiarias de Tamizaje + 18 de Melenas = 118
  // (las donantes no cuentan; quien está en dos programas cuenta dos veces).
  await expect(page.locator('.cifra').first()).toContainText('118');

  // Dato informativo: 15 personas aparecen en los dos programas.
  await expect(page.getByText('personas aparecen en más de un programa')).toBeVisible();
  await expect(page.getByText('15').first()).toBeVisible();

  // Cada programa por separado, con su leyenda de suma.
  await expect(page.getByText('Cada programa por separado')).toBeVisible();
  await expect(page.getByText('suma de las personas impactadas de cada programa')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tamizaje Rosa' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Melenas en Movimiento' })).toBeVisible();

  await page.getByRole('button', { name: 'Las cifras son correctas' }).click();
  await expect(page).toHaveURL(/\/informe\/global\/exportar/);
});
