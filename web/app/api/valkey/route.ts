import { leerMonitor } from '@/lib/monitor-valkey';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    return Response.json(await leerMonitor(), { headers });
  } catch {
    return Response.json({ error: 'No se pudo leer Valkey.' }, { status: 503, headers });
  }
}
