import { describe, expect, test } from 'vitest';
import {
  motivoBloqueo, pasoActual, pasosDe, puedeEntrar, type EstadoRecorrido,
} from './recorrido';

const base: EstadoRecorrido = {
  alcance: 'programa-a',
  fuentes: 0,
  trabajosEnCurso: 0,
  paresPendientes: 0,
  calidadResuelta: false,
  cifrasAprobadas: false,
  programasConArchivos: 0,
  programasFaltantes: [],
};

const globalConTodo = (m: Partial<EstadoRecorrido> = {}): EstadoRecorrido => ({
  ...base,
  alcance: 'global',
  programasConArchivos: 2,
  programasFaltantes: [],
  ...m,
});

describe('informe de programa', () => {
  test('los pasos son subir, calidad, vista previa, exportar', () => {
    expect(pasosDe('programa-a')).toEqual(['subir', 'calidad', 'vista-previa', 'exportar']);
  });

  test('sin archivos el paso actual es subir y calidad está bloqueada', () => {
    expect(pasoActual(base)).toBe('subir');
    expect(puedeEntrar(base, 'calidad')).toBe(false);
    expect(motivoBloqueo(base, 'calidad')).toBe('Primero sube al menos un archivo.');
  });

  test('con un archivo procesándose calidad sigue bloqueada', () => {
    const e = { ...base, fuentes: 1, trabajosEnCurso: 1 };
    expect(puedeEntrar(e, 'calidad')).toBe(false);
    expect(motivoBloqueo(e, 'calidad')).toBe('Espera a que termine de procesarse el archivo.');
    expect(pasoActual(e)).toBe('subir');
  });

  test('vista previa exige calidad resuelta; exportar exige cifras aprobadas', () => {
    const e = { ...base, fuentes: 2 };
    expect(puedeEntrar(e, 'vista-previa')).toBe(false);
    expect(puedeEntrar({ ...e, calidadResuelta: true }, 'vista-previa')).toBe(true);
    expect(puedeEntrar({ ...e, calidadResuelta: true }, 'exportar')).toBe(false);
    expect(puedeEntrar({ ...e, calidadResuelta: true, cifrasAprobadas: true }, 'exportar')).toBe(true);
  });

  test('siempre se puede volver atrás', () => {
    const e = { ...base, fuentes: 2, calidadResuelta: true, cifrasAprobadas: true };
    expect(puedeEntrar(e, 'subir')).toBe(true);
    expect(puedeEntrar(e, 'calidad')).toBe(true);
    expect(pasoActual(e)).toBe('exportar');
  });

  test('subir otro archivo reabre calidad y vista previa', () => {
    const e = { ...base, fuentes: 2, calidadResuelta: true, cifrasAprobadas: true };
    const trasSubir = { ...e, calidadResuelta: false, cifrasAprobadas: false };
    expect(puedeEntrar(trasSubir, 'vista-previa')).toBe(false);
    expect(pasoActual(trasSubir)).toBe('calidad');
  });
});

describe('informe global', () => {
  test('no tiene paso subir', () => {
    expect(pasosDe('global')).toEqual(['calidad', 'vista-previa', 'exportar']);
    expect(puedeEntrar(globalConTodo(), 'subir')).toBe(false);
    expect(motivoBloqueo(globalConTodo(), 'subir')).toContain('no tiene subida');
  });

  test('bloqueado hasta que los dos programas tengan archivos', () => {
    const e = globalConTodo({ programasConArchivos: 1, programasFaltantes: ['Programa B'] });
    expect(puedeEntrar(e, 'calidad')).toBe(false);
    expect(motivoBloqueo(e, 'calidad')).toBe('Falta subir archivos de Programa B.');
    const e0 = globalConTodo({ programasConArchivos: 0, programasFaltantes: ['Programa A', 'Programa B'] });
    expect(motivoBloqueo(e0, 'calidad')).toBe('Falta subir archivos de Programa A y Programa B.');
  });

  test('cero programas con archivos también bloquea', () => {
    const e = globalConTodo({ programasConArchivos: 0, programasFaltantes: [] });
    expect(puedeEntrar(e, 'calidad')).toBe(false);
  });

  test('con los dos programas, calidad abre y rige el resto de la cadena', () => {
    const e = globalConTodo();
    expect(puedeEntrar(e, 'calidad')).toBe(true);
    expect(pasoActual(e)).toBe('calidad');
    expect(puedeEntrar(e, 'vista-previa')).toBe(false);
    expect(puedeEntrar({ ...e, calidadResuelta: true, cifrasAprobadas: true }, 'exportar')).toBe(true);
  });

  test('subir a un programa reabre calidad y vista previa del global', () => {
    const e = globalConTodo({ calidadResuelta: false, cifrasAprobadas: false });
    expect(pasoActual(e)).toBe('calidad');
    expect(puedeEntrar(e, 'exportar')).toBe(false);
  });
});
