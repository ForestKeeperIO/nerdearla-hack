import { expect, test } from 'vitest';
import { isValidFolio, newFolio } from './folio';

test('folio válido y con verificador', () => {
  for (let i = 0; i < 200; i++) {
    const f = newFolio();
    expect(f).toMatch(/^EIRA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(isValidFolio(f)).toBe(true);
    const roto = f.slice(0, -1) + (f.endsWith('2') ? '3' : '2');
    expect(isValidFolio(roto)).toBe(false);
  }
});

test('acepta minúsculas y espacios alrededor; rechaza otros formatos', () => {
  const f = newFolio();
  expect(isValidFolio(`  ${f.toLowerCase()} `)).toBe(true);
  expect(isValidFolio('EIRA-XXXX-XXXX')).toBe(false);
  expect(isValidFolio('')).toBe(false);
  expect(isValidFolio('María Ejemplo')).toBe(false);
});
