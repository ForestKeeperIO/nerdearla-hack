// Limpia la base: borra solo las claves "eira:*" (con SCAN, nunca FLUSHALL ni
// KEYS en bucle) y deja eira:contrato = 1. Después de esto la base queda vacía.
import { conectar } from './conexion';
import { contrato, patronTodo } from './claves';

export async function limpiar(v = conectar(), cerrar = true): Promise<number> {
  let cursor = '0';
  let borradas = 0;
  do {
    const [siguiente, claves] = await v.scan(cursor, 'MATCH', patronTodo(), 'COUNT', 500);
    cursor = siguiente;
    if (claves.length) {
      await v.unlink(...claves);
      borradas += claves.length;
    }
  } while (cursor !== '0');
  await v.set(contrato(), '1');
  if (cerrar) v.disconnect();
  return borradas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = await limpiar();
  console.log(`Base limpia: ${n} claves borradas; eira:contrato = 1.`);
}
