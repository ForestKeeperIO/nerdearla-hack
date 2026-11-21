// Semilla de desarrollo (base 5): el caso nuevo del demo — Tamizaje Rosa y
// Melenas en Movimiento, con los IDS del catálogo como valor de `programa`.
// Determinista e idempotente: limpia las claves eira:* de la base antes de cargar.
// Corre desde la raíz del repositorio:
//   VALKEY_URL=redis://127.0.0.1:6379/5 npx tsx web/scripts/semilla-dev.ts
import { createHash } from 'node:crypto';
import { Valkey } from 'iovalkey';
import {
  anom, bitacora, campoConteo, cnt, contrato, fuente, fuentes, nac, omitidas,
  pares, perCerteza, perCiudad, perDonantes, perImpactadas, perPeriodo, perPrograma, perServicio, perTipo,
  perTodas, presencia, sinid, trabajo, trabajos, valores,
} from '../lib/claves';

const v = new Valkey(
  process.env.VALKEY_URL ?? 'redis://127.0.0.1:6379/5',
  process.env.VALKEY_PASSWORD ? { password: process.env.VALKEY_PASSWORD } : {},
);

const TAM = 'tamizaje-rosa';
const MEL = 'melenas-en-movimiento';

const CIUDADES = [
  'Zapotlán el Grande', 'Sayula', 'Gómez Farías', 'Tapalpa', 'Jocotepec', 'San Martín Hidalgo',
];
// Clave INEGI de cada municipio de la semilla (los 6 son de Jalisco, clave 14).
const MUNICIPIO: Record<string, string> = {
  'Zapotlán el Grande': '14023',
  'Sayula': '14082',
  'Gómez Farías': '14079',
  'Tapalpa': '14086',
  'Jocotepec': '14050',
  'San Martín Hidalgo': '14077',
};
const PERIODOS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const CORTE = '2026-09-30';
const CREADO = '2026-11-21T14:00:00Z';

const F_TAM = 'f-tamizaje-rosa';
const F_MEL = 'f-melenas-en-movimiento';

// Identificador opaco y determinista (estilo HMAC) por persona.
const pid = (i: number) =>
  'p' + createHash('sha256').update(`eira-demo-persona-${i}`).digest('hex').slice(0, 15);

const nacimiento = (i: number) => {
  const a = 1961 + ((i * 7) % 40);
  const m = 1 + ((i * 5) % 12);
  const d = 1 + ((i * 11) % 28);
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const ciudadDe = (i: number) => CIUDADES[i % CIUDADES.length];

// --- Reparto de personas (ficticias) ------------------------------------------
// Tamizaje Rosa: 100 beneficiarias (personas 0..99), 120 atenciones.
// Melenas: 55 donantes y 18 beneficiarias de peluca.
//   - Donantes: personas 85..99 de Tamizaje (15 en ambos programas) + 40 nuevas (100..139).
//   - Beneficiarias: 18 nuevas (140..157).
const TAM_PERSONAS = 100;
const MEL_DONANTES = [...Array(55).keys()].map((i) => (i < 15 ? 85 + i : 100 + (i - 15)));
const MEL_BENEF = [...Array(18).keys()].map((i) => 140 + i);

async function registrar(
  unidad: string, programa: string, servicio: string,
  iPersona: number, periodo: string,
) {
  const id = pid(iPersona);
  const ciudad = ciudadDe(iPersona);
  const pipe = v.pipeline();
  pipe.hincrby(cnt(unidad), campoConteo(programa, ciudad, periodo, servicio), 1);
  pipe.hincrby(presencia(programa), MUNICIPIO[ciudad], 1);
  pipe.hincrby(presencia('global'), MUNICIPIO[ciudad], 1);
  pipe.sadd(perTodas(), id);
  pipe.sadd(perPrograma(programa), id);
  pipe.sadd(unidad === 'donacion' ? perDonantes(programa) : perImpactadas(programa), id);
  pipe.sadd(perTipo(unidad), id);
  pipe.sadd(perCiudad(ciudad), id);
  pipe.sadd(perPeriodo(periodo), id);
  pipe.sadd(perServicio(servicio), id);
  await pipe.exec();
}

async function main() {
  // Limpieza idempotente de las claves del proyecto en esta base.
  let cursor = '0';
  const borrar: string[] = [];
  do {
    const [sig, lote] = await v.scan(cursor, 'MATCH', 'eira:*', 'COUNT', 500);
    cursor = sig;
    borrar.push(...lote);
  } while (cursor !== '0');
  if (borrar.length) await v.del(...borrar);

  // Personas: nacimiento y certeza (158 en total).
  const p0 = v.pipeline();
  for (let i = 0; i <= 157; i++) {
    p0.hset(nac(), pid(i), nacimiento(i));
    p0.sadd(perCerteza(i % 3 === 0 ? 'folio' : 'id'), pid(i));
  }
  await p0.exec();

  // Tamizaje Rosa: 120 atenciones sobre 100 personas.
  const serviciosTam = ['Papanicolaou', 'Ultrasonido de mama', 'Exploración clínica'];
  for (let r = 0; r < 120; r++) {
    await registrar('atencion', TAM, serviciosTam[r % 3], r % TAM_PERSONAS, PERIODOS[r % 6]);
  }
  // 8 atenciones sin persona identificada.
  for (let r = 0; r < 8; r++) {
    await v.hincrby(sinid(), campoConteo(TAM, CIUDADES[r % 6], PERIODOS[(r * 2) % 6], 'Exploración clínica'), 1);
    await v.hincrby(presencia(TAM), MUNICIPIO[CIUDADES[r % 6]], 1);
    await v.hincrby(presencia('global'), MUNICIPIO[CIUDADES[r % 6]], 1);
  }

  // Melenas en Movimiento: 60 donaciones de trenza (55 donantes) y
  // 20 entregas de peluca (18 beneficiarias). Nunca se suman entre sí.
  for (let r = 0; r < 60; r++) {
    await registrar('donacion', MEL, 'Trenza', MEL_DONANTES[r % MEL_DONANTES.length], PERIODOS[(r * 3) % 6]);
  }
  for (let r = 0; r < 20; r++) {
    await registrar('producto_entregado', MEL, 'Peluca oncológica', MEL_BENEF[r % MEL_BENEF.length], PERIODOS[(r * 5) % 6]);
  }
  // 5 entregas de peluca sin persona identificada.
  for (let r = 0; r < 5; r++) {
    await v.hincrby(sinid(), campoConteo(MEL, CIUDADES[(r * 2) % 6], PERIODOS[(r * 3) % 6], 'Peluca oncológica'), 1);
    await v.hincrby(presencia(MEL), MUNICIPIO[CIUDADES[(r * 2) % 6]], 1);
    await v.hincrby(presencia('global'), MUNICIPIO[CIUDADES[(r * 2) % 6]], 1);
  }

  // Fuentes importadas.
  const cargada = (m: number) => new Date(Date.parse('2026-11-21T14:00:00Z') + m * 60000).toISOString();
  const metas: [string, Record<string, string>, number][] = [
    [F_TAM, {
      nombre: 'tamizaje-rosa.xlsx', programa: TAM, unidad: 'atencion',
      fecha_corte: CORTE, cargada_en: cargada(0), por: 'Coord. Tamizaje',
      filas: '132', filas_nuevas: '132', filas_omitidas: '0', inasistencias: '6',
      estrellas: '4', puntaje: '84',
      motivos: JSON.stringify(['8 registros sin persona identificada', '3 anomalías de calidad', '6 inasistencias registradas']),
    }, 0],
    [F_MEL, {
      nombre: 'melenas-en-movimiento.xlsx', programa: MEL, unidad: 'donacion',
      fecha_corte: CORTE, cargada_en: cargada(9), por: 'Coord. Melenas',
      filas: '85', filas_nuevas: '85', filas_omitidas: '0', inasistencias: '0',
      estrellas: '3', puntaje: '72',
      motivos: JSON.stringify(['60 donaciones y 20 entregas de peluca en un solo archivo', '5 registros sin persona identificada', '2 anomalías de calidad']),
    }, 9],
  ];
  const p1 = v.pipeline();
  for (const [id, campos, min] of metas) {
    p1.zadd(fuentes(), Math.floor(Date.parse(cargada(min)) / 1000), id);
    p1.hset(fuente(id), campos);
  }
  await p1.exec();

  // Anomalías por fuente.
  const anoms: [string, object[]][] = [
    [F_TAM, [
      { fila: 17, regla: 'faltante', campo: 'id', detalle: 'ID vacío' },
      { fila: 44, regla: 'fecha_futura', campo: 'fecha', detalle: 'La fecha de servicio es posterior al corte' },
      { fila: 88, regla: 'ciudad_desconocida', campo: 'ciudad', detalle: 'Municipio no reconocido en el catálogo' },
    ]],
    [F_MEL, [
      { fila: 23, regla: 'faltante', campo: 'largo', detalle: 'Largo de la trenza vacío' },
      { fila: 61, regla: 'fecha_invalida', campo: 'fecha', detalle: 'Formato de fecha no reconocido' },
    ]],
  ];
  for (const [id, lista] of anoms) {
    for (const a of lista) await v.rpush(anom(id), JSON.stringify(a));
  }

  // 3 pares pendientes de decisión humana (etiquetas: iniciales, no nombres).
  const listaPares: [string, string, string, string][] = [
    ['par-01', 'Mismo ID, nombres distintos',
      'M. E. L. · Sayula · 42 años', 'M. E. L. · Sayula · 42 años'],
    ['par-02', 'Posible variante de escritura',
      'C. A. V. · Jocotepec · 38 años', 'C. A. V. · Jocotepec · 38 años'],
    ['par-03', 'Misma fecha de nacimiento y ciudad',
      'L. A. · Gómez Farías · 47 años', 'L. A. · Gómez Farías · 47 años'],
  ];
  for (let i = 0; i < listaPares.length; i++) {
    const [id, motivo, ea, eb] = listaPares[i];
    await v.hset(pares(), id, JSON.stringify({
      id, estado: 'pendiente', motivo,
      a: { fuente: F_TAM, fila: 10 + i * 3, etiqueta: ea },
      b: { fuente: F_MEL, fila: 20 + i * 5, etiqueta: eb },
    }));
  }

  // Trabajos de ejemplo: uno duplicado y uno versión nueva.
  const listaTrabajos: [string, Record<string, string>][] = [
    ['tr-001', {
      estado: 'listo', nombre: 'tamizaje-rosa.xlsx', programa: TAM, unidad: 'atencion',
      fecha_corte: CORTE, por: 'Coord. Tamizaje', creado_en: CREADO, terminado_en: '2026-11-21T14:00:42Z',
      mensaje: 'Se agregaron 132 filas.', nivel_duplicado: 'distinto', fuente: F_TAM,
      fuente_original: '', filas: '132', filas_nuevas: '132', filas_omitidas: '0', filas_repetidas: '0',
      mapeo: JSON.stringify([
        { encabezado: 'Nombre completo', campo: 'nombre', probabilidad: 0.98 },
        { encabezado: 'Fecha de nac.', campo: 'fecha_nacimiento', probabilidad: 0.95 },
        { encabezado: 'Municipio', campo: 'ciudad', probabilidad: 0.97 },
      ]),
    }],
    ['tr-002', {
      estado: 'listo', nombre: 'melenas-en-movimiento.xlsx', programa: MEL, unidad: 'donacion',
      fecha_corte: CORTE, por: 'Coord. Melenas', creado_en: '2026-11-21T14:09:00Z',
      terminado_en: '2026-11-21T14:09:37Z',
      mensaje: 'Se agregaron 85 filas: 60 donaciones y 20 entregas de peluca.', nivel_duplicado: 'distinto', fuente: F_MEL,
      fuente_original: '', filas: '85', filas_nuevas: '85', filas_omitidas: '0', filas_repetidas: '0',
      mapeo: JSON.stringify([
        { encabezado: 'Tipo', campo: 'tipo_registro', probabilidad: 0.99 },
        { encabezado: 'Nombre', campo: 'nombre', probabilidad: 0.96 },
      ]),
    }],
    ['tr-003', {
      estado: 'duplicado', nombre: 'reporte_final_2.xlsx', programa: TAM, unidad: 'atencion',
      fecha_corte: CORTE, por: 'Coord. Tamizaje', creado_en: '2026-11-21T14:20:00Z',
      terminado_en: '2026-11-21T14:20:03Z',
      mensaje: "Este archivo ya se cargó el 21 nov como 'tamizaje-rosa.xlsx'. No se vuelve a cargar.",
      nivel_duplicado: 'identico', fuente: '', fuente_original: F_TAM,
      filas: '132', filas_nuevas: '0', filas_omitidas: '132', filas_repetidas: '0', mapeo: '[]',
    }],
    ['tr-004', {
      estado: 'listo', nombre: 'tamizaje-rosa_v2.xlsx', programa: TAM, unidad: 'atencion',
      fecha_corte: '2026-10-31', por: 'Coord. Tamizaje', creado_en: '2026-11-21T14:30:00Z',
      terminado_en: '2026-11-21T14:30:51Z',
      mensaje: "Parece una versión nueva de 'tamizaje-rosa.xlsx': 122 filas ya estaban y se omiten; se agregan 8.",
      nivel_duplicado: 'version_nueva', fuente: '', fuente_original: F_TAM,
      filas: '130', filas_nuevas: '8', filas_omitidas: '122', filas_repetidas: '0', mapeo: '[]',
    }],
  ];
  for (const [id, campos] of listaTrabajos) {
    await v.hset(trabajo(id), campos);
    await v.xadd(trabajos(), '*', 'id', id, 'nombre', campos.nombre, 'programa', campos.programa,
      'unidad', campos.unidad, 'fecha_corte', campos.fecha_corte, 'por', campos.por);
  }

  // 8 filas de melenas-en-movimiento.xlsx ya estaban, igual, en tamizaje-rosa.xlsx
  // (traslape entre coordinaciones: solo se ve al juntar los programas).
  for (let r = 0; r < 8; r++) {
    await v.rpush(omitidas(F_MEL), JSON.stringify({
      fila: 70 + r, ya_en_fuente: F_TAM, ya_en_fila: 1 + ((r * 7) % 120),
    }));
  }

  // Bitácora.
  const entradas: [string, string][] = [
    ['carga', "Se cargó 'tamizaje-rosa.xlsx': 132 filas, 120 atenciones."],
    ['carga', "Se cargó 'melenas-en-movimiento.xlsx': 60 donaciones y 20 entregas de peluca."],
    ['duplicado', "Se rechazó 'reporte_final_2.xlsx': archivo idéntico ya cargado."],
    ['version_nueva', "'tamizaje-rosa_v2.xlsx': 122 filas ya estaban; se agregan 8."],
    ['pares', 'Se detectaron 3 pares de personas que podrían ser la misma; esperan decisión.'],
    ['sin_identificar', '13 registros quedaron sin persona identificada.'],
  ];
  for (let i = 0; i < entradas.length; i++) {
    const [tipo, detalle] = entradas[i];
    await v.xadd(bitacora(), '*', 'en', new Date(Date.parse(CREADO) + i * 90000).toISOString(),
      'por', 'semilla-dev', 'tipo', tipo, 'detalle', detalle);
  }

  // Valores vistos por dimensión.
  const p2 = v.pipeline();
  for (const x of [TAM, MEL]) p2.sadd(valores('programa'), x);
  for (const x of CIUDADES) p2.sadd(valores('ciudad'), x);
  for (const x of PERIODOS) p2.sadd(valores('periodo'), x);
  for (const x of [...serviciosTam, 'Trenza', 'Peluca oncológica']) p2.sadd(valores('servicio'), x);
  await p2.exec();

  await v.set(contrato(), '1');

  const [perT, perM, perDon, perProd, inter] = await Promise.all([
    v.scard(perPrograma(TAM)), v.scard(perPrograma(MEL)),
    v.scard(perTipo('donacion')), v.scard(perTipo('producto_entregado')),
    v.call('SINTERCARD', 2, perPrograma(TAM), perPrograma(MEL)),
  ]);
  console.log(`Semilla-dev cargada: tamizaje ${perT} personas, melenas ${perM} (${perDon} donantes, ${perProd} beneficiarias), ${inter} en ambos.`);
}

main().finally(() => v.disconnect());
