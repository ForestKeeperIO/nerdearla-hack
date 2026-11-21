// Caso 1: base vacía — la portada muestra los informes del catálogo
// "Sin empezar" y el Global bloqueado con su motivo.
import { expect, test } from '@playwright/test';
import { limpiar } from './ayudas';

test.beforeEach(async () => {
  await limpiar();
});

test('portada con base vacía: programas sin empezar y Global bloqueado', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Informes de impacto' })).toBeVisible();

  // Los informes del catálogo (en_demo) más el Global.
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(page.getByText('Tamizaje Rosa')).toBeVisible();
  await expect(page.getByText('Melenas en Movimiento')).toBeVisible();
  await expect(page.getByText('Global · todos los programas')).toBeVisible();

  // Los dos programas aparecen "Sin empezar" con acción "Empezar".
  await expect(page.getByText('Sin empezar', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Empezar', { exact: true })).toHaveCount(2);

  // El Global está bloqueado y dice por qué.
  await expect(page.getByText('Bloqueado')).toBeVisible();
  await expect(
    page.getByText(/Falta subir archivos de .*Tamizaje Rosa.*Melenas en Movimiento/),
  ).toBeVisible();
});
