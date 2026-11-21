// Conexión a Valkey según el contrato: VALKEY_URL (por defecto
// redis://127.0.0.1:6379) y VALKEY_PASSWORD.
import { Valkey } from 'iovalkey';

export function conectar(): Valkey {
  const url = process.env.VALKEY_URL ?? 'redis://127.0.0.1:6379';
  const password = process.env.VALKEY_PASSWORD || undefined;
  return new Valkey(url, password ? { password } : {});
}
