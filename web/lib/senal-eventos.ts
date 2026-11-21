import { valkey } from './valkey';

// Pub/Sub no conserva historial ni separa bases. Solo fechamos señales recibidas
// por este proceso y nunca exponemos su contenido ni las atribuimos a esta base.
declare global {
  var __eiraEscucha: { lista: boolean; ultima: string | null } | undefined;
}

export function senalEventos() {
  if (!globalThis.__eiraEscucha) {
    const estado = { lista: false, ultima: null as string | null };
    globalThis.__eiraEscucha = estado;
    const sub = valkey().duplicate();
    sub.on('message', canal => {
      if (canal === 'eira:eventos') estado.ultima = new Date().toISOString();
    });
    sub.on('close', () => { estado.lista = false; });
    sub.on('ready', () => {
      void sub.subscribe('eira:eventos').then(() => { estado.lista = true; }).catch(() => { estado.lista = false; });
    });
  }
  return { ...globalThis.__eiraEscucha };
}
