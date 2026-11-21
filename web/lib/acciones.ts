'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { valkey } from './valkey';
import { decisiones } from './claves';
import { COOKIE_ROL, type Rol } from './rol';

export async function cambiarRol(rol: Rol) {
  if (rol !== 'coordinacion' && rol !== 'presidencia') return;
  const c = await cookies();
  c.set(COOKIE_ROL, rol, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  revalidatePath('/', 'layout');
}

async function porQuien(): Promise<string> {
  const c = await cookies();
  return c.get(COOKIE_ROL)?.value === 'presidencia' ? 'Presidencia' : 'Coordinación';
}

/** Decisión sobre un par de personas: XADD eira:decisiones (tipo persona). */
export async function decidirPar(parId: string, decision: 'misma' | 'distinta') {
  if (decision !== 'misma' && decision !== 'distinta') return;
  const por = await porQuien();
  await valkey().xadd(
    decisiones(), '*',
    'tipo', 'persona',
    'par', parId,
    'decision', decision,
    'por', por,
  );
  revalidatePath('/calidad');
}

/** "Contar de todos modos" una fila omitida: XADD eira:decisiones (tipo restituir_fila). */
export async function restituirFila(fuenteId: string, fila: number) {
  if (!fuenteId || !Number.isFinite(fila)) return;
  const por = await porQuien();
  await valkey().xadd(
    decisiones(), '*',
    'tipo', 'restituir_fila',
    'fuente', fuenteId,
    'fila', String(fila),
    'decision', 'restituir',
    'por', por,
  );
  revalidatePath('/calidad');
}
