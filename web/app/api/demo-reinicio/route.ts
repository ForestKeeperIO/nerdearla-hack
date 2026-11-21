import { execFile } from 'node:child_process';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Solo existe en la instancia efímera del recorrido guiado (EIRA_DEMO_EFIMERO=1):
// devuelve su copia aislada a la base limpia. En cualquier otra instancia responde 404.
let enCurso: Promise<boolean> | null = null;

function reiniciar(): Promise<boolean> {
  enCurso ??= new Promise<boolean>(listo => {
    execFile('bash', [process.env.EIRA_DEMO_REINICIO || ''], { timeout: 60000 }, error => listo(!error));
  }).finally(() => { enCurso = null; });
  return enCurso;
}

export async function POST() {
  if (process.env.EIRA_DEMO_EFIMERO !== '1' || !process.env.EIRA_DEMO_REINICIO)
    return NextResponse.json({ ok: false }, { status: 404 });
  const ok = await reiniciar();
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
