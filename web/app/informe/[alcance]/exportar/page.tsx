import { notFound, redirect } from 'next/navigation';
import { esAlcance } from '@/lib/informe';

export default async function ExportacionAnterior({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance } = await params;
  if (!esAlcance(alcance)) notFound();
  redirect(`/reportes/aliados?programa=${encodeURIComponent(alcance)}`);
}
