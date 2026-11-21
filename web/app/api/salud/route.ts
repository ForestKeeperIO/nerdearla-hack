import { NextResponse } from 'next/server';
import { valkey } from '@/lib/valkey';
import { patronTodo } from '@/lib/claves';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const v = valkey();
    const pong = await v.ping();
    let claves = 0;
    let cursor = '0';
    do {
      const [c, ks] = await v.scan(cursor, 'MATCH', patronTodo(), 'COUNT', 500);
      claves += ks.length;
      cursor = c;
    } while (cursor !== '0');
    return NextResponse.json({ ok: true, valkey: pong, claves });
  } catch (e) {
    return NextResponse.json(
      { ok: false, valkey: 'sin conexión', claves: 0, error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
