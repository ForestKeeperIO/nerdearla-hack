import { expect, test } from '@playwright/test';

test('la navegación y el embudo muestran el mismo corte que la lectura en vivo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/subir');
  const enlaces = page.getByRole('navigation', { name: 'Secciones' }).getByRole('link');
  await expect(enlaces.last()).toHaveText('Cómo funciona');
  await expect(enlaces.nth((await enlaces.count()) - 2)).toHaveText('Subir archivos');
  const primera = page.waitForResponse(r => r.url().endsWith('/api/como-funciona') && r.ok());
  await enlaces.last().click();
  const d = await (await primera).json();
  const formatear = (n: number | null) => n === null ? '—' : n.toLocaleString('es-MX');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cómo funciona');
  await expect(page.locator('.cf-filas li > strong')).toHaveText(
    [d.recibidas,d.rechazados,d.previas,d.internas].map(formatear));
  await expect(page.locator('.cf-hitos strong')).toHaveText(
    [d.coincidentes,d.pendientes+d.decididos].map(formatear));
  await expect(page.locator('.cf-resultado > strong')).toHaveText(formatear(d.unicas));
  await expect(page.locator('.cf-tabla tbody tr')).toHaveCount(d.cargas.length);
  for (const [i, c] of d.cargas.entries()) {
    const fila = page.locator('.cf-tabla tbody tr').nth(i);
    await expect(fila).toContainText(c.veredicto);
    if (c.estrellas !== null) await expect(fila.getByRole('img', { name:`${c.estrellas} de 5 estrellas` })).toBeVisible();
  }
  const otra = await page.waitForResponse(r => r.url().endsWith('/api/como-funciona') && r.ok());
  expect(Date.parse((await otra.json()).leidoEn)).toBeGreaterThan(Date.parse(d.leidoEn));
  await page.locator('.cf-devin summary').click();
  await expect(page.locator('.cf-devin details')).toHaveAttribute('open', '');
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:width === 1440 ? 900 : 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (process.env.CAPTURAS_COMO) {
      await page.screenshot({ path:`${process.env.CAPTURAS_COMO}/como-funciona-${width}.png`,fullPage:true });
    }
  }
  // Simula una interrupción de red en este navegador, sin detener ni escribir en Valkey.
  await page.route('**/api/como-funciona', r => r.fulfill({status:503,body:'{}'}));
  await expect(page.getByRole('status').filter({hasText:'últimos datos leídos'})).toBeVisible({timeout:16000});
  await expect(page.locator('.cf-resultado > strong')).toHaveText(formatear(d.unicas));
});
