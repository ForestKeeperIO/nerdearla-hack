import { expect, test } from '@playwright/test';

// Ejecutar sobre una base con registros del motor en Jalisco; no modifica datos.
test('busca un municipio, alterna con Enter y comparte la selección', async ({ page }) => {
  await page.goto('/tablero');
  const estado = page.getByRole('combobox', { name:'Estado', exact:true });
  await estado.focus();
  await page.keyboard.press('Tab');
  const municipio = page.getByRole('combobox', { name:'Municipio', exact:true });
  await expect(municipio).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type('zapot');
  const opcion = page.getByRole('option',{name:/Zapotlán el Grande/});
  await expect(opcion).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/municipio=14023/);
  const chip = page.getByRole('button',{name:/Municipio: Zapotlán el Grande/});
  await expect(chip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(municipio).toBeFocused();
  await expect(municipio).toHaveAttribute('aria-expanded','false');
  await page.reload();
  await expect(chip).toBeVisible();
  await municipio.focus();
  await page.keyboard.press('Backspace');
  await expect(page).not.toHaveURL(/municipio=/);
});
