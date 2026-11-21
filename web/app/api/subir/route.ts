import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { valkey } from '@/lib/valkey';
import { archivo, informe, trabajo, trabajos } from '@/lib/claves';
import { tiposDe } from '@/lib/catalogo';
import { esAlcance } from '@/lib/informe';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo leer el archivo enviado.' }, { status: 400 });
  }

  const archivoSubido = form.get('archivo');
  const programa = String(form.get('programa') ?? '').trim();
  const unidad = String(form.get('unidad') ?? '').trim();
  const fechaCorte = String(form.get('fecha_corte') ?? '').trim();
  const por = String(form.get('por') ?? '').trim() || 'Coordinación';
  // Estado al que corresponden las ciudades del archivo (por defecto Jalisco, 14).
  const estadoClave = /^\d{2}$/.test(String(form.get('estado_clave') ?? ''))
    ? String(form.get('estado_clave'))
    : '14';

  if (!(archivoSubido instanceof File) || archivoSubido.size === 0) {
    return NextResponse.json({ ok: false, error: 'Falta el archivo.' }, { status: 400 });
  }
  const nombre = archivoSubido.name || 'archivo';
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsm') {
    return NextResponse.json(
      { ok: false, error: 'Los archivos .xlsm (con macros) no se aceptan. Guarda una copia como .xlsx y súbela.' },
      { status: 400 },
    );
  }
  if (ext !== 'xlsx' && ext !== 'csv') {
    return NextResponse.json(
      { ok: false, error: 'Solo se aceptan archivos .xlsx o .csv.' },
      { status: 400 },
    );
  }
  if (archivoSubido.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `El archivo pesa más de 10 MB (${Math.round(archivoSubido.size / 1048576)} MB).` },
      { status: 400 },
    );
  }
  if (!programa || programa === 'global' || !esAlcance(programa) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)) {
    return NextResponse.json(
      { ok: false, error: 'Falta el programa o la fecha de corte.' },
      { status: 400 },
    );
  }
  if (unidad !== 'segun_fila' && !tiposDe(programa).some((t) => t.clave === unidad)) {
    return NextResponse.json({ ok: false, error: 'El tipo de registro no es válido para este programa.' }, { status: 400 });
  }

  const bytes = Buffer.from(await archivoSubido.arrayBuffer());
  const id = `tr-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  const creadoEn = new Date().toISOString();

  const v = valkey();
  // Exactamente lo del contrato: SET con caducidad, HSET estado pendiente, XADD.
  await v.set(archivo(id), bytes, 'EX', 3600);
  await v.hset(trabajo(id), {
    estado: 'pendiente',
    nombre,
    programa,
    unidad,
    estado_clave: estadoClave,
    fecha_corte: fechaCorte,
    por,
    creado_en: creadoEn,
  });
  // Un archivo nuevo reabre la revisión: Calidad y Vista previa del programa y del Global.
  const ahora = new Date().toISOString();
  for (const alcanceInforme of [programa, 'global']) {
    const clave = informe(alcanceInforme);
    if (!(await v.exists(clave))) await v.hset(clave, 'creado_en', ahora);
    await v.hset(clave, 'calidad_resuelta', '0', 'cifras_aprobadas', '0');
  }
  if (!(await v.hget(informe(programa), 'fecha_corte'))) {
    await v.hset(informe(programa), 'fecha_corte', fechaCorte);
  }
  await v.xadd(
    trabajos(), '*',
    'id', id,
    'nombre', nombre,
    'programa', programa,
    'unidad', unidad,
    'estado_clave', estadoClave,
    'fecha_corte', fechaCorte,
    'por', por,
  );

  return NextResponse.json({ ok: true, id });
}
