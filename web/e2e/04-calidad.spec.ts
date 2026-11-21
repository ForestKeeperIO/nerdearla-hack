// Caso 4: con la semilla — Calidad muestra estrellas (3 = 3 llenas),
// "¿Es la misma persona?", cada botón escribe la decisión en el Stream
// eira:decisiones, y "Continuar" solo se habilita cuando toca.
import { expect, test } from '@playwright/test';
import { semilla, valkey } from './ayudas';

test.beforeEach(() => {
  semilla();
});

test('Calidad: estrellas por archivo y decisiones al Stream eira:decisiones', async ({ page }) => {
  // Melenas tiene estrellas = 3 en la semilla.
  await page.goto('/informe/melenas-en-movimiento/calidad');
  const tarjetaMel = page.locator('article', { hasText: 'melenas-en-movimiento.xlsx' });
  await expect(tarjetaMel.locator('.estrella-llena')).toHaveCount(3);
  await expect(tarjetaMel.locator('.estrella-vacia')).toHaveCount(2);

  // Los pares pendientes se ven en Tamizaje Rosa (por la fuente del lado A).
  await page.goto('/informe/tamizaje-rosa/calidad');
  const tarjetaTam = page.locator('article', { hasText: 'tamizaje-rosa.xlsx' });
  await expect(tarjetaTam.locator('.estrella-llena')).toHaveCount(4);

  await expect(page.getByText('¿Es la misma persona?')).toBeVisible();
  await expect(page.getByText('Faltan 3 por decidir')).toBeVisible();
  await expect(page.getByText('Registro A')).toBeVisible();
  await expect(page.getByText('Registro B')).toBeVisible();

  // Cada clic en un botón escribe una decisión en el Stream.
  const v = valkey();
  try {
    await page.getByRole('button', { name: 'Es la misma persona' }).click();
    await expect(page.getByText('Faltan 2 por decidir')).toBeVisible();
    let msgs = await v.xrange('eira:decisiones', '-', '+');
    expect(msgs.length).toBe(1);
    expect(msgs[0][1]).toContain('misma');

    await page.getByRole('button', { name: 'Son dos personas' }).click();
    await expect(page.getByText('Faltan 1 por decidir')).toBeVisible();
    msgs = await v.xrange('eira:decisiones', '-', '+');
    expect(msgs.length).toBe(2);
    expect(msgs[1][1]).toContain('distinta');
    expect(msgs[1][1]).toContain('persona');

    await page.getByRole('button', { name: 'Es la misma persona' }).click();
    await expect(page.getByText('No quedan casos por decidir.')).toBeVisible();
    msgs = await v.xrange('eira:decisiones', '-', '+');
    expect(msgs.length).toBe(3);
  } finally {
    v.disconnect();
  }

  // Sin pendientes, el botón pasa a "Continuar a Vista previa" y lleva ahí.
  const continuar = page.getByRole('button', { name: 'Continuar a Vista previa' });
  await expect(continuar).toBeEnabled();
  await continuar.click();
  await expect(page).toHaveURL(/\/informe\/tamizaje-rosa\/vista-previa/);
});
