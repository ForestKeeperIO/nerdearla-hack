'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { emitirDecision } from './datos';
import { escribirInforme, esAlcance } from './informe';
import type { Alcance } from './recorrido';

const POR = 'Presidencia';

function base(alcance: Alcance) {
  return `/informe/${alcance}`;
}

/** Decisión sobre un par de personas: XADD eira:decisiones (tipo persona). */
export async function decidirPar(alcance: string, parId: string, decision: 'misma' | 'distinta') {
  if (!esAlcance(alcance)) return;
  if (decision !== 'misma' && decision !== 'distinta') return;
  await emitirDecision({ tipo: 'persona', par: parId, decision, por: POR });
  revalidatePath(base(alcance), 'layout');
}

/** Decisión en masa sobre pares seleccionados: un XADD por par en eira:decisiones
    (mismo camino que la decisión individual — el procesador los aplica igual). */
export async function decidirPares(alcance: string, parIds: string[], decision: 'misma' | 'distinta') {
  if (!esAlcance(alcance)) return;
  if (decision !== 'misma' && decision !== 'distinta') return;
  for (const parId of parIds.filter((id) => typeof id === 'string' && id.length > 0)) {
    await emitirDecision({ tipo: 'persona', par: parId, decision, por: POR });
  }
  revalidatePath(base(alcance), 'layout');
  revalidatePath('/tablero');
}

/** "Contar de todos modos" una fila omitida: XADD eira:decisiones (tipo restituir_fila). */
export async function restituirFila(alcance: string, fuenteId: string, fila: number) {
  if (!esAlcance(alcance)) return;
  if (!fuenteId || !Number.isFinite(fila)) return;
  await emitirDecision({
    tipo: 'restituir_fila',
    fuente: fuenteId,
    fila: String(fila),
    decision: 'restituir',
    por: POR,
  });
  revalidatePath(base(alcance), 'layout');
}

/** La usuaria termina Calidad (con o sin decisiones pendientes). */
export async function resolverCalidad(alcance: string) {
  if (!esAlcance(alcance)) return;
  await escribirInforme(alcance as Alcance, { calidad_resuelta: '1' });
  revalidatePath(base(alcance), 'layout');
  redirect(`${base(alcance)}/vista-previa`);
}

/** "Las cifras son correctas": abre Exportar. */
export async function aprobarCifras(alcance: string) {
  if (!esAlcance(alcance)) return;
  await escribirInforme(alcance as Alcance, { cifras_aprobadas: '1' });
  revalidatePath(base(alcance), 'layout');
  redirect(`${base(alcance)}/exportar`);
}

/** Fecha de corte del informe, la primera vez que se entra. */
export async function fijarFechaCorte(alcance: string, formData: FormData) {
  if (!esAlcance(alcance)) return;
  const fecha = String(formData.get('fecha_corte') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  await escribirInforme(alcance as Alcance, { fecha_corte: fecha });
  revalidatePath(base(alcance), 'layout');
}
