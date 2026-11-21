import { describe, expect, test } from 'vitest';
import { avisarOtroPrograma } from './duplicado-otro-programa';

const nombres: Record<string, string> = { 'tamizaje-rosa': 'Tamizaje Rosa', 'melenas-en-movimiento': 'Melenas en Movimiento' };
const nombre = (p: string) => nombres[p] ?? p;
const fuentes: Record<string, string> = { 'f-1': 'tamizaje-rosa' };
const programaDe = (f: string) => fuentes[f];
const base = {
  estado: 'duplicado', programa: 'melenas-en-movimiento', fuente_original: 'f-1',
  mensaje: "Este archivo ya se cargó el 21 nov como 'prueba.xlsx'. No se vuelve a cargar.",
};

describe('aviso de duplicado en otro programa', () => {
  test('dice en qué programa quedó el archivo y qué hacer', () => {
    const t = avisarOtroPrograma(base, programaDe, nombre);
    expect(t.mensaje).toContain(base.mensaje);
    expect(t.mensaje).toContain('Quedó cargado en Tamizaje Rosa, no en Melenas en Movimiento.');
    expect(t.mensaje).toContain('retirarlo');
  });

  test('no cambia el aviso si el original está en el mismo programa', () => {
    const t = { ...base, programa: 'tamizaje-rosa' };
    expect(avisarOtroPrograma(t, programaDe, nombre)).toBe(t);
    // La fuente puede traer el nombre en lugar del id.
    expect(avisarOtroPrograma({ ...t, programa: 'Tamizaje Rosa' }, programaDe, nombre).mensaje).toBe(base.mensaje);
  });

  test('no toca trabajos que no son duplicados ni duplicados sin fuente conocida', () => {
    const listo = { ...base, estado: 'listo' };
    expect(avisarOtroPrograma(listo, programaDe, nombre)).toBe(listo);
    const sinFuente = { ...base, fuente_original: 'f-desconocida' };
    expect(avisarOtroPrograma(sinFuente, programaDe, nombre)).toBe(sinFuente);
  });
});
