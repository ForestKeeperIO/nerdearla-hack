'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { emitirDecision } from './datos';
import { escribirInforme, esAlcance, paresDe } from './informe';
import { pares } from './claves';
import { valkey } from './valkey';
import type { Alcance } from './recorrido';
import { opcionesPar, type IntencionPar } from './decision-par';

const POR = 'Presidencia';

function base(alcance: Alcance) {
  return `/informe/${alcance}`;
}

/** Decisión sobre un par de personas: XADD eira:decisiones (tipo persona). */
export async function decidirPar(alcance: string, parId: string, decision: 'misma' | 'distinta') {
  return decidirPares(alcance, [parId], decision);
}

/** Decisión en masa sobre pares seleccionados: un XADD por par en eira:decisiones
    (mismo camino que la decisión individual — el procesador los aplica igual). */
export async function decidirPares(alcance: string, parIds: string[], intencion: IntencionPar | 'misma') {
  if (!esAlcance(alcance) || !Array.isArray(parIds) || !(intencion === 'misma' || Object.hasOwn(opcionesPar, intencion))) return false;
  const decision = intencion === 'distinta' ? 'distinta' : 'misma';
  const pendientes = new Set((await paresDe(alcance)).valor.filter(p => p.estado === 'pendiente').map(p => p.id));
  const ids = [...new Set(parIds)].filter(id => pendientes.has(id));
  for (const parId of ids) {
    await emitirDecision({ tipo: 'persona', par: parId, decision, intencion, por: POR });
  }
  // XADD confirma la recepción, no la decisión. La lista y la banda se vuelven
  // a renderizar con el hash que escribió el procesador, nunca con un total local.
  let aplicado = ids.length === 0;
  for (let i = 0; i < 12 && !aplicado; i++) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const filas = await valkey().hmget(pares(), ...ids);
    aplicado = filas.every(s => s !== null && JSON.parse(s).estado === decision);
  }
  revalidatePath(base(alcance), 'layout');
  revalidatePath('/tablero');
  return aplicado;
}

/** "Contar de todos modos" una fila omitida: XADD eira:decisiones (tipo restituir_fila). */
export async function restituirFila(alcance: string, fuenteId: string, fila: number) {
  if (process.env.EIRA_VISTA_LECTURA === '1') return;
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
  if (process.env.EIRA_VISTA_LECTURA === '1') redirect(`${base(alcance)}/vista-previa`);
  await escribirInforme(alcance as Alcance, { calidad_resuelta: '1' });
  revalidatePath(base(alcance), 'layout');
  redirect(`${base(alcance)}/vista-previa`);
}

/** "Las cifras son correctas": abre Exportar. */
export async function aprobarCifras(alcance: string) {
  if (!esAlcance(alcance)) return;
  if (process.env.EIRA_VISTA_LECTURA === '1') redirect('/subir');
  await escribirInforme(alcance as Alcance, { cifras_aprobadas: '1' });
  revalidatePath(base(alcance), 'layout');
  redirect('/subir');
}

/** Fecha de corte del informe, la primera vez que se entra. */
export async function fijarFechaCorte(alcance: string, formData: FormData) {
  if (process.env.EIRA_VISTA_LECTURA === '1') return;
  if (!esAlcance(alcance)) return;
  const fecha = String(formData.get('fecha_corte') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  await escribirInforme(alcance as Alcance, { fecha_corte: fecha });
  revalidatePath(base(alcance), 'layout');
}
