// Caso 6: Exportar — descargar el CSV y comprobar BOM, encabezados y que
// ninguna celda empiece con =, +, - o @ sin apóstrofo.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { semilla } from './ayudas';

test.beforeEach(() => {
  semilla();
});

/** Campos de una línea CSV respetando comillas. */
function camposCsv(linea: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (enComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ',') {
      campos.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos;
}

test('Exportar: el CSV descarga con BOM, encabezados y celdas seguras', async ({ page }) => {
  // Recorrido real por la interfaz: Calidad → Vista previa → Exportar.
  await page.goto('/informe/tamizaje-rosa/calidad');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect(page).toHaveURL(/\/vista-previa/);
  await page.getByRole('button', { name: 'Las cifras son correctas' }).click();
  await expect(page).toHaveURL(/\/informe\/tamizaje-rosa\/exportar/);
  await expect(page.getByRole('heading', { name: 'Exportar informe' })).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Descargar CSV' }).click(),
  ]);
  const ruta = await descarga.path();
  expect(ruta).toBeTruthy();
  expect(descarga.suggestedFilename()).toContain('.csv');

  const buf = readFileSync(ruta!);

  // BOM UTF-8 (EF BB BF) para que Excel lo abra bien.
  expect(buf[0]).toBe(0xef);
  expect(buf[1]).toBe(0xbb);
  expect(buf[2]).toBe(0xbf);

  const texto = buf.toString('utf8').replace(/^﻿/, '');
  const lineas = texto.split('\r\n').filter((l) => l.length > 0);
  expect(lineas.length).toBeGreaterThan(2);

  expect(lineas[0]).toBe('indicador,valor,unidad,definicion,fecha_corte,fuentes,advertencias');

  // Ninguna celda empieza con =, +, - o @ a menos que lleve apóstrofo delante.
  const peligrosas: string[] = [];
  for (const linea of lineas) {
    for (const campo of camposCsv(linea)) {
      if (/^[=+\-@]/.test(campo)) peligrosas.push(campo);
    }
  }
  expect(peligrosas, `celdas con fórmula sin proteger: ${peligrosas.join(' | ')}`).toHaveLength(0);
});
