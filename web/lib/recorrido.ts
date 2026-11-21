// Estado del recorrido guiado por informe (alcance). Puro: sin acceso a Valkey.
// Reglas de docs/superpowers/specs/2026-11-21-impacto-eira-diseno.md.

export type Alcance = 'tamizaje-rosa' | 'salud-que-florece' | 'global';

export type Paso = 'subir' | 'calidad' | 'vista-previa' | 'exportar';

export interface EstadoRecorrido {
  alcance: Alcance;
  /** Archivos ya importados del informe (del programa, o de todos para el Global). */
  fuentes: number;
  /** Archivos pendientes o procesándose del alcance. */
  trabajosEnCurso: number;
  /** Pares de personas sin decidir del alcance. */
  paresPendientes: number;
  calidadResuelta: boolean;
  cifrasAprobadas: boolean;
  /** Solo Global: cuántos programas del demo tienen al menos un archivo. */
  programasConArchivos: number;
  /** Solo Global: nombres de los programas del demo que aún no tienen archivo. */
  programasFaltantes: string[];
}

/** Pasos del informe: el Global no tiene Subir (usa lo que ya subió cada programa). */
export function pasosDe(alcance: Alcance): Paso[] {
  return alcance === 'global' ? ['calidad', 'vista-previa', 'exportar'] : ['subir', 'calidad', 'vista-previa', 'exportar'];
}

export const TITULO_PASO: Record<Paso, string> = {
  subir: 'Subir',
  calidad: 'Calidad',
  'vista-previa': 'Vista previa',
  exportar: 'Exportar',
};

/** Requisitos de un paso que no dependen de los pasos anteriores. */
function requisito(e: EstadoRecorrido, p: Paso): boolean {
  switch (p) {
    case 'subir':
      return e.alcance !== 'global';
    case 'calidad':
      if (e.alcance === 'global') return e.programasConArchivos >= 2 && e.programasFaltantes.length === 0;
      return e.fuentes >= 1 && e.trabajosEnCurso === 0;
    case 'vista-previa':
      return e.calidadResuelta;
    case 'exportar':
      return e.cifrasAprobadas;
  }
}

/** Si la persona puede entrar al paso: requisito propio más el del paso anterior en la cadena. */
export function puedeEntrar(e: EstadoRecorrido, p: Paso): boolean {
  if (p === 'subir') return requisito(e, 'subir');
  if (p === 'calidad') return requisito(e, 'calidad');
  if (p === 'vista-previa') return puedeEntrar(e, 'calidad') && requisito(e, 'vista-previa');
  return puedeEntrar(e, 'vista-previa') && requisito(e, 'exportar');
}

/** El paso que toca ahora: el primero sin resolver dentro de los alcanzables. */
export function pasoActual(e: EstadoRecorrido): Paso {
  const pasos = pasosDe(e.alcance);
  for (const p of pasos) {
    if (p === 'subir' && requisito(e, 'calidad')) continue;
    if (p === 'calidad' && requisito(e, 'calidad') && e.calidadResuelta) continue;
    if (p === 'vista-previa' && requisito(e, 'vista-previa') && e.cifrasAprobadas) continue;
    return p;
  }
  return pasos[pasos.length - 1];
}

/** Frase para la usuaria cuando un paso está bloqueado; null si se puede entrar. */
export function motivoBloqueo(e: EstadoRecorrido, p: Paso): string | null {
  if (puedeEntrar(e, p)) return null;
  if (p === 'subir') return 'El informe global no tiene subida: usa los archivos de cada programa.';
  if (p === 'calidad') {
    if (e.alcance === 'global') {
      return `Falta subir archivos de ${e.programasFaltantes.join(' y ')}.`;
    }
    if (e.trabajosEnCurso > 0) return 'Espera a que termine de procesarse el archivo.';
    return 'Primero sube al menos un archivo.';
  }
  // El bloqueo puede venir del paso anterior.
  if (!puedeEntrar(e, 'calidad')) return motivoBloqueo(e, 'calidad');
  if (p === 'vista-previa') return 'Primero revisa la calidad de los datos.';
  if (!puedeEntrar(e, 'vista-previa')) return 'Primero revisa la calidad de los datos.';
  return 'Primero confirma las cifras en la vista previa.';
}

/** Índice del paso (0-based) dentro de los pasos del informe; -1 si no aplica. */
export function indicePaso(alcance: Alcance, p: Paso): number {
  return pasosDe(alcance).indexOf(p);
}

/** Ruta de un paso del informe. */
export function rutaPaso(alcance: Alcance, p: Paso): string {
  return `/informe/${alcance}/${p}`;
}

/** A dónde mandar a la persona si intenta entrar a un paso bloqueado. */
export function rutaDestino(e: EstadoRecorrido): string {
  if (e.alcance === 'global' && !puedeEntrar(e, 'calidad')) return '/';
  return rutaPaso(e.alcance, pasoActual(e));
}
