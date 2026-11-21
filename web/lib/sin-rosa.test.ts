// Ningún rosa, magenta ni fucsia en el frontend: ni por nombre ni por tono.
// Recorre los archivos fuente de web/ y falla si aparece un color prohibido.
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(__dirname, '..');
const EXTENSIONES = new Set(['.css', '.ts', '.tsx', '.json']);
const OMITIR = new Set(['sin-rosa.test.ts', 'package-lock.json', 'components.json', 'TERCEROS.md']);

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '.hallmark') continue;
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (EXTENSIONES.has(ruta.slice(ruta.lastIndexOf('.'))) && !OMITIR.has(e)) yield ruta;
  }
}

/** Tono de un #rgb/#rrggbb en grados 0-360. */
function tonoHex(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return -1; // gris: sin tono
  const d = max - min;
  let t: number;
  if (max === r) t = ((g - b) / d) % 6;
  else if (max === g) t = (b - r) / d + 2;
  else t = (r - g) / d + 4;
  return ((t * 60) + 360) % 360;
}

/** Tono aproximado de un hsl()/oklch(): el número de tono declarado. */
function tonoDeclarado(c: string): number | null {
  const m = /(?:hsl|oklch|lch)\(\s*[\d.]+%?\s+[\d.]+%?\s+([\d.]+)/i.exec(c)
    ?? /(?:hsl|oklch|lch)\(\s*([\d.]+)/i.exec(c);
  return m ? Number(m[1]) % 360 : null;
}

const esRosa = (t: number) => t >= 0 && ((t >= 0 && t <= 20) || t >= 295);

describe('sin rosa', () => {
  const problemas: string[] = [];

  for (const ruta of archivos(RAIZ)) {
    const rel = relative(RAIZ, ruta);
    const texto = readFileSync(ruta, 'utf8');
    const lineas = texto.split('\n');
    lineas.forEach((linea, i) => {
      if (/\b(rose|pink|fuchsia|magenta|rosa)\b/i.test(linea)) {
        // "rosa" solo cuenta como color, no en nombres propios del dominio.
        if (!/tamizaje|movimiento rosa|Tamizaje|Movimiento Rosa/i.test(linea) || /rose|pink|fuchsia|magenta|--color-rosa|text-rosa|bg-rosa|border-rosa/i.test(linea)) {
          problemas.push(`${rel}:${i + 1} palabra prohibida: ${linea.trim().slice(0, 80)}`);
        }
      }
      for (const m of linea.matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g)) {
        const t = tonoHex(m[0]);
        if (esRosa(t)) problemas.push(`${rel}:${i + 1} color rosa ${m[0]} (tono ${t.toFixed(0)}°)`);
      }
      for (const m of linea.matchAll(/(?:hsl|oklch|lch)\([^)]+\)/gi)) {
        const t = tonoDeclarado(m[0]);
        if (t !== null && esRosa(t)) problemas.push(`${rel}:${i + 1} función rosa ${m[0]}`);
      }
      // Clases de Tailwind con tono rojizo-rosado.
      if (/\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:rose|pink|fuchsia|red)-/i.test(linea)) {
        problemas.push(`${rel}:${i + 1} clase rosa: ${linea.trim().slice(0, 80)}`);
      }
    });
  }

  test('ningún archivo contiene rosa, magenta ni fucsia', () => {
    expect(problemas).toEqual([]);
  });
});
