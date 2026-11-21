import { motorActivo } from './claves';

export function baseAnalitica() {
  if (motorActivo() === 'motor') return process.env.IMPACTO_DB;
  const ruta = process.env.EIRA_TABLERO_DB;
  if (!ruta) throw new Error('Falta EIRA_TABLERO_DB para el tablero de Selma');
  return ruta;
}
