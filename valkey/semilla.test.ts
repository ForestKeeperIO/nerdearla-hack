// Pruebas de la base de Valkey contra la instancia local del puerto 6391,
// base 15 (no toca la base por defecto ni la instancia del 6379).
import { afterAll, beforeAll, expect, test } from 'vitest';
import { Valkey } from 'iovalkey';
import { cargarSemilla } from './semilla';
import { limpiar } from './limpiar';
import { verificar } from './verificar';
import { contrato, patronTodo } from './claves';

let v: Valkey;

beforeAll(async () => {
  const url = process.env.VALKEY_URL ?? 'redis://127.0.0.1:6391/15';
  const password = process.env.VALKEY_PASSWORD || undefined;
  v = new Valkey(url, password ? { password } : {});
  await cargarSemilla(v);
}, 30000);

afterAll(() => v.disconnect());

test('después de la semilla, verificar pasa todos los invariantes', async () => {
  const r = await verificar(v);
  expect(r.filter((x) => !x.ok)).toEqual([]);
});

test('después de limpiar, solo existe eira:contrato', async () => {
  await limpiar(v, false);
  let cursor = '0';
  const ks: string[] = [];
  do {
    const [sig, lote] = await v.scan(cursor, 'MATCH', patronTodo(), 'COUNT', 500);
    cursor = sig;
    ks.push(...lote);
  } while (cursor !== '0');
  expect(ks).toEqual([contrato()]);
  expect(await v.get(contrato())).toBe('1');
});
