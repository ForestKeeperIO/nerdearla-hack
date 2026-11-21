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
  await page.keyboard.press('Escape');
  await expect(municipio).toBeFocused();
  await expect(municipio).toHaveAttribute('aria-expanded','false');
  await expect(municipio).toHaveValue('Zapotlán el Grande');
  await page.reload();
  await expect(municipio).toHaveValue('Zapotlán el Grande');
  await municipio.focus();
  await page.keyboard.press('Backspace');
  await expect(page).not.toHaveURL(/municipio=/);
});

test('el rango ocupa un solo filtro y el CSV conserva el cruce', async ({ page }) => {
  await page.goto('/tablero?programa=tamizaje-rosa&municipio=14050,14077,14079&servicio=Exploraci%C3%B3n+cl%C3%ADnica&desde=2026-02&hasta=2026-10');
  const total = await page.locator('[data-kpi=personas]').innerText();
  await expect(page.getByRole('status').first()).toContainText(`Mostrando ${total} personas`);
  await expect(page.getByRole('combobox',{name:'Municipio',exact:true})).toHaveValue('3 municipios');
  await expect(page.locator('[data-kpi=donantes]')).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  const csv = await page.request.get((await page.getByRole('link',{name:'Exportar',exact:true}).getAttribute('href'))!);
  expect(await csv.text()).toContain(`"Personas impactadas por programa","${total}"`);
  const reporte = new URL((await page.getByRole('link',{name:'Sacar reporte'}).getAttribute('href'))!,page.url());
  expect(reporte.pathname).toBe('/reportes');
  expect(Object.fromEntries(reporte.searchParams)).toMatchObject({ origen:'tablero',programa:'tamizaje-rosa',municipio:'14050,14077,14079',
    servicio:'Exploración clínica',desde:'2026-02',hasta:'2026-10' });
  await page.setViewportSize({width:390,height:844});
  const abrir = page.getByRole('button',{name:'Filtros (4)'});
  await abrir.click();
  const hoja = page.getByRole('dialog',{name:'Filtros',exact:true});
  await hoja.locator('summary').click();
  await hoja.getByRole('button',{name:'Último mes'}).click();
  const corte = (await page.locator('.atlas-titulo time').getAttribute('datetime'))!.slice(0,7);
  await expect(page).toHaveURL(url => url.searchParams.get('desde')===corte && url.searchParams.get('hasta')===corte);
  await hoja.getByRole('button',{name:'Ver resultados'}).click();
  await expect(abrir).toBeFocused();
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();
  await expect(page).toHaveURL(/\/tablero$/);
  await expect(page.locator('[data-kpi=donantes]')).toBeVisible();
  await expect(page.getByRole('link',{name:'Sacar reporte'})).toHaveAttribute('href','/reportes?origen=tablero');
});
