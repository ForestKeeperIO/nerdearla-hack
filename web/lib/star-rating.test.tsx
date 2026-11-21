import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { StarRating } from '../components/ui/star-rating';

describe('StarRating', () => {
  test('con 3 dibuja 3 estrellas llenas y 2 vacías, todas del mismo tamaño', () => {
    const html = renderToStaticMarkup(createElement(StarRating, { valor: 3 }));
    // 5 estrellas en total: la fila vacía de fondo y la franja llena encima.
    const estrellasLlenas = html.match(/estrella-llena/g) ?? [];
    const estrellasVacias = html.match(/estrella-vacia/g) ?? [];
    expect(estrellasLlenas).toHaveLength(3);
    expect(estrellasVacias).toHaveLength(2);
    // Todas comparten la misma clase de tamaño.
    const clases = [...html.matchAll(/class="([^"]*estrella-(?:llena|vacia)[^"]*)"/g)].map((m) => m[1]);
    expect(clases).toHaveLength(5);
    const tamanos = new Set(clases.map((c) => /size-\S+/.exec(c)?.[0]));
    expect(tamanos.size).toBe(1);
  });

  test('la etiqueta accesible dice la calificación', () => {
    const html = renderToStaticMarkup(createElement(StarRating, { valor: 4 }));
    expect(html).toContain('4 de 5');
  });
});
