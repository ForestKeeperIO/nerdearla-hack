import { NextResponse } from 'next/server';
import { listarFuentes, listarTrabajos } from '@/lib/datos';

export const dynamic = 'force-dynamic';

/** Estado en vivo para la pantalla de Subir: trabajos y fuentes. */
export async function GET() {
  try {
    const [t, f] = await Promise.all([listarTrabajos(), listarFuentes()]);
    return NextResponse.json({ ok: true, trabajos: t.valor, fuentes: f.valor, ms: t.ms + f.ms });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
