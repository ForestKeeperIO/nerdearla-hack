import { leerRevision } from '@/lib/tablero-impacto';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ revision: leerRevision() }, { headers: { 'Cache-Control': 'no-store' } });
}
