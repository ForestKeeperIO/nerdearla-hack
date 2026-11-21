// Rol simulado, guardado en cookie. Sin sesiones ni contraseñas.
import { cookies } from 'next/headers';

export type Rol = 'coordinacion' | 'presidencia';
export const COOKIE_ROL = 'eira-rol';

export async function rolActual(): Promise<Rol> {
  const c = await cookies();
  return c.get(COOKIE_ROL)?.value === 'presidencia' ? 'presidencia' : 'coordinacion';
}
