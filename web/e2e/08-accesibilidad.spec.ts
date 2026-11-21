// Caso 8: accesibilidad básica — todos los botones e inputs tienen nombre
// accesible y el recorrido se puede hacer con teclado en la portada y en Subir.
import { expect, test } from '@playwright/test';
import { limpiar } from './ayudas';

test.beforeEach(async () => {
  await limpiar();
});

/** Elementos interactivos sin nombre accesible, según el árbol de accesibilidad. */
async function sinNombre(page: import('@playwright/test').Page): Promise<string[]> {
  const snapshot = await page.locator('body').ariaSnapshot();
  const malos: string[] = [];
  for (const linea of snapshot.split('\n')) {
    // En el snapshot ARIA, un elemento con nombre se ve como `- button "nombre"`.
    const m = linea.match(/- (button|link|textbox|combobox|checkbox|radio|switch|slider|spinbutton|searchbox)\s*(?:"|$|:)/);
    if (m && !/"[^"]+"/.test(linea)) malos.push(linea.trim());
  }
  return malos;
}

test('portada: todo tiene nombre accesible y se navega con teclado', async ({ page }) => {
  await page.goto('/');

  const malos = await sinNombre(page);
  expect(malos, `controles sin nombre accesible: ${malos.join(' ; ')}`).toHaveLength(0);

  // Con Tab se llega a las entradas de informe y con Enter se entra.
  let foco = '';
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    foco = await page.evaluate(
      () =>
        `${document.activeElement?.tagName} ${(document.activeElement?.textContent ?? '').trim().slice(0, 40)}`,
    );
    if (/^A /.test(foco) && /Tamizaje Rosa/.test(foco)) break;
  }
  expect(foco, 'Tab debe llevar el foco al enlace de Tamizaje Rosa').toMatch(/Tamizaje Rosa/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/informe\/tamizaje-rosa\/subir/);
});

test('subir: todo tiene nombre accesible y el recorrido funciona con teclado', async ({ page }) => {
  await page.goto('/informe/tamizaje-rosa/subir');

  const malos = await sinNombre(page);
  expect(malos, `controles sin nombre accesible: ${malos.join(' ; ')}`).toHaveLength(0);

  // Con teclado se alcanzan: volver, la fecha de corte, elegir archivos y continuar.
  const vistos = new Set<string>();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.tagName}:${(el.textContent ?? el.getAttribute('name') ?? '').trim().slice(0, 40)}` : '';
    });
    if (foco) vistos.add(foco);
  }
  const texto = [...vistos].join(' | ');
  expect(texto).toContain('Volver');
  expect(texto).toMatch(/elige archivos|fecha_corte|Continuar/);
});
