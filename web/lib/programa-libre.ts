import { normaliza } from './filtros-comun';

export const UNIDADES_LIBRES = ['atencion', 'participacion', 'entrega_insumo', 'donacion'] as const;
export const SIN_ALTA = 'Este programa no está en el catálogo del procesador. Pide su alta a coordinación. El archivo no se ha registrado.';

export function resolverNombre<T extends { id: string; nombre: string }>(texto: string, programas: T[]) {
  const clave = normaliza(texto.trim()).replace(/\s+/g, ' ');
  return programas.find(p => normaliza(p.nombre) === clave || p.id === clave);
}
