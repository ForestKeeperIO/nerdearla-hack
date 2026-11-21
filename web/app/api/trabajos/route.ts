import { NextResponse } from 'next/server';
import { fuentesDe, trabajosDe, esAlcance } from '@/lib/informe';
import type { Alcance } from '@/lib/recorrido';

export const dynamic = 'force-dynamic';

/** Estado en vivo para la pantalla de Subir: trabajos y fuentes del alcance. */
export async function GET(request: Request) {
  const a = new URL(request.url).searchParams.get('alcance') ?? 'global';
  const alcance: Alcance = esAlcance(a) ? a : 'global';
  try {
    const [t, f] = await Promise.all([trabajosDe(alcance), fuentesDe(alcance)]);
    return NextResponse.json({ ok: true, trabajos: t.valor, fuentes: f.valor, ms: t.ms + f.ms });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
