import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { valkey } from '@/lib/valkey';
import { archivo, trabajo, trabajos } from '@/lib/claves';
import { UNIDADES } from '@/lib/comun';

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
  if (!programa || !/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte)) {
    return NextResponse.json(
      { ok: false, error: 'Falta el programa o la fecha de corte.' },
      { status: 400 },
    );
  }
  if (!UNIDADES.includes(unidad as (typeof UNIDADES)[number])) {
    return NextResponse.json({ ok: false, error: 'La unidad no es válida.' }, { status: 400 });
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
    fecha_corte: fechaCorte,
    por,
    creado_en: creadoEn,
  });
  await v.xadd(
    trabajos(), '*',
    'id', id,
    'nombre', nombre,
    'programa', programa,
    'unidad', unidad,
    'fecha_corte', fechaCorte,
    'por', por,
  );

  return NextResponse.json({ ok: true, id });
}
