import { afterEach, expect, it, vi } from 'vitest';
import { clavesRoles } from './claves';

afterEach(() => vi.unstubAllEnvs());

it.each([undefined, 'motor'])('usa el contrato anterior con %s', (motor) => {
  vi.stubEnv('EIRA_MOTOR', motor);
  expect(clavesRoles('tamizaje-rosa')).toEqual({
    impactadas: 'eira:per:impactadas:tamizaje-rosa', donantes: 'eira:per:donantes:tamizaje-rosa',
  });
});

it('separa las donantes sin buscar claves del motor anterior', () => {
  vi.stubEnv('EIRA_MOTOR', 'selma');
  expect(clavesRoles('melenas-en-movimiento')).toEqual({
    impactadas: 'eira:per:programa:melenas-en-movimiento', donantes: 'eira:don:programa:melenas-en-movimiento',
  });
});

it('rechaza una configuración desconocida', () => {
  vi.stubEnv('EIRA_MOTOR', 'selmaa');
  expect(() => clavesRoles('x')).toThrow(/EIRA_MOTOR/);
});
