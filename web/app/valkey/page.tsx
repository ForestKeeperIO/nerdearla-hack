import { MonitorVivo } from '@/components/monitor-valkey';
import { leerMonitor } from '@/lib/monitor-valkey';
import './monitor.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Monitor de Valkey' };

export default async function PaginaValkey() {
  return <MonitorVivo inicial={await leerMonitor().catch(() => null)} />;
}
