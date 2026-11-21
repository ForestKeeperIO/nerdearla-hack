import { expect, test } from '@playwright/test';

test('el monitor consume lecturas reales, se actualiza y conserva el corte si falla la red', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/subir');
  const nav = page.getByRole('navigation', {name: 'Secciones'}).getByRole('link');
  await expect(nav).toHaveText(['Tablero','Reportes','Subir archivos','Cómo funciona','Valkey']);
  const respuesta = () => page.waitForResponse(r => r.url().endsWith('/api/valkey') && r.ok());
  const inicial = respuesta();
  await nav.last().click();
  const d = await (await inicial).json();
  await expect(nav.last()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', {name: `Base ${d.db}`, exact: true}).locator('..')).toContainText(`${d.claves} claves`);
  const m = await (await respuesta()).json();
  expect(Date.parse(m.leido)).toBeGreaterThan(Date.parse(d.leido));
  await expect(page.locator('.vk-curva figcaption')).not.toHaveText(/^1 de/);
  for (const width of [1440,390]) {
    await page.setViewportSize({width, height: width === 1440 ? 900 : 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (process.env.CAPTURAS_VALKEY) await page.screenshot({path: `${process.env.CAPTURAS_VALKEY}/valkey-${width}.png`, fullPage: true});
  }
  await page.route('**/api/valkey', r => r.fulfill({status: 503, body: '{}'}));
  await expect(page.getByRole('status').filter({hasText: 'Se conserva la última lectura'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Mapa de claves'})).toBeVisible();
  await page.unroute('**/api/valkey');
  await expect(page.locator('.vk-error')).toBeEmpty();
});

test('una visita con un recorrido previo no sale del monitor ni emite escrituras', async ({page}) => {
  const escrituras: string[] = [];
  await page.route('**/*', r => {
    if (r.request().method() !== 'GET') { escrituras.push(r.request().method()); return r.abort(); }
    return r.continue();
  });
  await page.addInitScript(() => sessionStorage.setItem('eira-demo', JSON.stringify({i: 0, unidad: 'atencion'})));
  await page.goto('/valkey');
  await page.waitForResponse(r => r.url().endsWith('/api/valkey') && r.ok());
  await expect(page).toHaveURL(/\/valkey$/);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.getByRole('button', {name: 'Pausar'}).click();
  await expect(page.getByText('Lectura en pausa', {exact: false})).toBeVisible();
  expect(escrituras).toEqual([]);
});
