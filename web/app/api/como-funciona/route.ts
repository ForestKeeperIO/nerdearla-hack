import { leerObservatorio } from '@/lib/observatorio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    return Response.json(await leerObservatorio(), { headers });
  } catch {
    return Response.json({ error: 'No se pudo leer el estado de Valkey.' }, { status: 503, headers });
  }
}
