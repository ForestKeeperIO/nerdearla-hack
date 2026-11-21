import { notFound, redirect } from 'next/navigation';
import { esAlcance, estadoRecorrido } from '@/lib/informe';
import { rutaDestino } from '@/lib/recorrido';

export const dynamic = 'force-dynamic';

export default async function Informe({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance } = await params;
  if (!esAlcance(alcance)) notFound();
  redirect(rutaDestino(await estadoRecorrido(alcance)));
}
