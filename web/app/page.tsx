import { redirect } from 'next/navigation';
import { estadoRecorrido } from '@/lib/informe';

export const dynamic = 'force-dynamic';

// Llegada: con datos, el Tablero es la pantalla principal; sin datos, Informes.
export default async function Portada() {
  const global = await estadoRecorrido('global');
  redirect(global.fuentes > 0 ? '/tablero' : '/informe');
}
