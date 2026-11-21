import { describe, expect, it } from 'vitest';
import { FASES, PASOS, etiquetaFase, fraseResultado, pasoValido } from './demo-guiado';

describe('guion del recorrido guiado', () => {
  it('recorre las cuatro fases en orden y cierra', () => {
    const fases = PASOS.map(p => p.fase);
    expect([...new Set(fases)]).toEqual([0, 1, 2, 3, -1]);
    expect(fases.slice(0, -1)).toEqual([...fases.slice(0, -1)].sort());
    expect(FASES).toHaveLength(4);
  });
  it('sube la hoja antes de mostrar el resultado', () => {
    const subir = PASOS.findIndex(p => p.accion === 'subir');
    expect(PASOS[subir + 1].accion).toBe('resultado');
  });
  it('etiqueta el avance y sanea el índice', () => {
    expect(etiquetaFase(PASOS[0])).toBe('Paso 1 de 4 · Filtrar el Tablero');
    expect(etiquetaFase(PASOS.at(-1)!)).toBe('Fin del recorrido');
    expect(pasoValido('3')).toBe(3);
    expect(pasoValido('99')).toBe(0);
    expect(pasoValido(null)).toBe(0);
  });
  it('explica el archivo repetido sin sumar doble', () => {
    expect(fraseResultado({ estado: 'procesando' })).toBeNull();
    expect(fraseResultado({ estado: 'duplicado' })).toContain('no se cuenta dos veces');
    expect(fraseResultado({ estado: 'listo', mensaje: 'Se agregaron 33 filas.' })).toBe('Se agregaron 33 filas.');
  });
});
