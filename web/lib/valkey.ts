// Cliente único de Valkey para todo el frontend.
// Solo se usa en el servidor (rutas, acciones y componentes de servidor):
// el navegador nunca habla con Valkey.
import { Valkey } from 'iovalkey';

declare global {
  // eslint-disable-next-line no-var
  var __eiraValkey: Valkey | undefined;
}

export function valkey(): Valkey {
  if (!globalThis.__eiraValkey) {
    globalThis.__eiraValkey = new Valkey(
      process.env.VALKEY_URL ?? 'redis://127.0.0.1:6379',
      {
        password: process.env.VALKEY_PASSWORD || undefined,
        maxRetriesPerRequest: 2,
        lazyConnect: false,
      },
    );
  }
  return globalThis.__eiraValkey;
}
