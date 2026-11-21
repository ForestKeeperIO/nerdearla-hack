// Guarda de paso: si la persona entra por dirección directa a un paso bloqueado,
// la manda al paso que toca (o a la portada cuando el informe entero está bloqueado).
import { notFound, redirect } from 'next/navigation';
import { esAlcance, estadoRecorrido } from './informe';
import { puedeEntrar, rutaDestino, type Alcance, type EstadoRecorrido, type Paso } from './recorrido';

export async function exigirPaso(alcanceCrudo: string, paso: Paso): Promise<{ alcance: Alcance; estado: EstadoRecorrido }> {
  if (!esAlcance(alcanceCrudo)) notFound();
  const estado = await estadoRecorrido(alcanceCrudo);
  if (!puedeEntrar(estado, paso)) redirect(rutaDestino(estado));
  return { alcance: alcanceCrudo, estado };
}
