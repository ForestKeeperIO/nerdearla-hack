// Solo la paleta de EIRA (docs/referencias/paleta-eira.md) y los neutros
// derivados declarados en :root de app/tokens.css. Falla si aparece:
//  · un color literal (hex, rgb, hsl, oklch…) fuera de tokens.css,
//  · una clase de color de Tailwind que no sea un token semántico,
//  · un var(--…) de color no declarado en :root,
//  · o falta/cambia un token obligatorio de la paleta.
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(__dirname, '..');
const TOKENS = join(RAIZ, 'app', 'tokens.css');
const EXTENSIONES = new Set(['.css', '.ts', '.tsx']);
const OMITIR = new Set(['solo-paleta.test.ts', 'sin-rosa.test.ts']);

/** Tokens obligatorios de la paleta EIRA con su valor exacto. */
const PALETA: Record<string, string> = {
  '--papel': '#fdfaf9',
  '--superficie': '#ffffff',
  '--tinta': '#2e2e2e',
  '--tinta-suave': '#6b5c5c',
  '--linea': '#eadfdd',
  '--vino': '#7d3b3b',
  '--vino-oscuro': '#5f2b2b',
  '--ciruela': '#6a2b51',
  '--rubor': '#ffebee',
  '--rosa': '#ffa9b8',
  '--pizarra': '#7e8ba3',
  '--aviso': '#b0595a',
  '--error': '#843f3f',
};

/** Propiedades declaradas en cualquier hoja del proyecto (:root, @theme…). */
const declaradas = new Set<string>();

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '.hallmark' || e === 'public') continue;
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (EXTENSIONES.has(ruta.slice(ruta.lastIndexOf('.'))) && !OMITIR.has(e)) yield ruta;
  }
}

function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

// Recolecta todas las propiedades personalizadas declaradas en las hojas.
for (const ruta of archivos(RAIZ)) {
  if (!ruta.endsWith('.css')) continue;
  const texto = sinComentarios(readFileSync(ruta, 'utf8'));
  for (const m of texto.matchAll(/(--[a-z0-9-]+)\s*:/gi)) declaradas.add(m[1].toLowerCase());
}

/** Un var(--x) es válido si está declarado o es una variable de next/font. */
const varPermitida = (nombre: string) =>
  declaradas.has(nombre) || /^--font-/.test(nombre);

/** Nombres de color de la escala de Tailwind: siempre prohibidos (usar tokens). */
const ESCALA_TW =
  /(?:bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder|caret|decoration|outline|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/;

const FUNCION_COLOR = /\b(?:rgba?|hsla?|oklch|lch|lab|oklab|color)\s*\(/i;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const VAR_REF = /var\((--[a-z0-9-]+)/gi;

describe('solo paleta', () => {
  test('tokens.css declara la paleta EIRA con sus valores exactos', () => {
    const texto = readFileSync(TOKENS, 'utf8');
    for (const [nombre, valor] of Object.entries(PALETA)) {
      const re = new RegExp(`${nombre}\\s*:\\s*${valor.replace('#', '#')}\\b`, 'i');
      expect(texto, `falta ${nombre}: ${valor} en tokens.css`).toMatch(re);
    }
  });

  const problemas: string[] = [];
  for (const ruta of archivos(RAIZ)) {
    const rel = relative(RAIZ, ruta);
    const esTokens = ruta === TOKENS;
    const texto = sinComentarios(readFileSync(ruta, 'utf8'));
    texto.split('\n').forEach((linea, i) => {
      const pos = (n: number) => `${rel}:${i + 1}`;
      if (!esTokens) {
        for (const m of linea.matchAll(HEX)) {
          problemas.push(`${pos(i)} color literal ${m[0]} (usa un token de :root)`);
        }
        if (FUNCION_COLOR.test(linea)) {
          problemas.push(`${pos(i)} función de color: ${linea.trim().slice(0, 80)}`);
        }
      }
      if (ESCALA_TW.test(linea)) {
        problemas.push(`${pos(i)} clase de color fuera de la paleta: ${linea.trim().slice(0, 80)}`);
      }
      for (const m of linea.matchAll(VAR_REF)) {
        if (!varPermitida(m[1].toLowerCase())) {
          problemas.push(`${pos(i)} var(${m[1]}) no declarada en :root`);
        }
      }
    });
  }

  test('ningún color literal ni clase fuera de la paleta y sus neutros', () => {
    expect(problemas).toEqual([]);
  });
});
