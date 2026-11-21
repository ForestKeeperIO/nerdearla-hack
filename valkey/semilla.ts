// Semilla de demostración: datos ficticios coherentes con docs/contrato-valkey.md.
// Determinista (semilla fija) e idempotente: limpia la base antes de cargar.
// Sirve para que el frontend tenga qué mostrar antes de que exista el
// procesamiento en Python.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Valkey } from 'iovalkey';
import { conectar } from './conexion';
import { limpiar } from './limpiar';
import {
  anom, bitacora, campoConteo, cnt, contrato, den, fuente, fuentes, nac,
  omitidas, pares, perCerteza, perCiudad, perDonantes, perImpactadas,
  perPeriodo, perPrograma, perServicio, perTodas, presencia, sinid, trabajo,
  trabajos, valores,
} from './claves';

// --- Datos ficticios fijos -------------------------------------------------

// Ciudad → clave INEGI de municipio (Jalisco, publicos/municipios_mexico.json).
const CIUDADES: [string, string][] = [
  ['Zapotlán el Grande', '14023'], ['Sayula', '14082'], ['Gómez Farías', '14079'],
  ['Tapalpa', '14086'], ['Jocotepec', '14050'], ['San Martín Hidalgo', '14077'],
];

const PERIODOS = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

// Ids de iniciativa de catalogos/iniciativas.json (el campo `programa` lleva
// el id, no el nombre para mostrar).
const P_TAMIZAJE = 'tamizaje-rosa';
const P_MELENAS = 'melenas-en-movimiento';
const P_NUTRICION = 'comunidades-de-origen';

const S_PAP = 'Papanicolaou';
const S_USG = 'Ultrasonido de mama';
const S_EXP = 'Exploración clínica';
const S_TRENZA = 'Donación de trenza';
const S_PELUCA = 'Entrega de peluca';
const S_NUT = 'Valoración nutricional';

const F_TAMIZAJE = 'f-tamizaje-rosa';
const F_MELENAS = 'f-melenas-en-movimiento';
const F_NUTRICION = 'f-nutricion';

const N_PERSONAS = 150;

// Nombres completos ficticios usados SOLO para derivar etiquetas (iniciales).
// Nunca se escriben en Valkey; verificar.ts comprueba que ningún valor los
// contiene.
export const NOMBRES_FICTICIOS = [
  'María Elena López', 'María Elena Landa', 'Guadalupe Torres',
  'María Guadalupe Torres', 'Carmen Alicia Vega', 'Carmen Alisia Vega',
  'Rosa Isela Mora', 'Rosa Izela Mora', 'Leticia Anaya', 'Leticia Anaia',
];

function etiqueta(nombre: string, ciudad: string, edad: number): string {
  const iniciales = nombre.split(' ').map((p) => p[0]).join('. ') + '.';
  return `${iniciales} · ${ciudad} · ${edad} años`;
}

// Identificador opaco y determinista (estilo HMAC) para la persona i.
const pid = (i: number) =>
  'p' + createHash('sha256').update(`eira-demo-persona-${i}`).digest('hex').slice(0, 15);

const nacimiento = (i: number) => {
  const a = 1961 + ((i * 7) % 40); // 25 a 64 años en 2026
  const m = 1 + ((i * 5) % 12);
  const d = 1 + ((i * 11) % 28);
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const ciudadDe = (i: number) => CIUDADES[i % CIUDADES.length][0];
const claveDe = (i: number) => CIUDADES[i % CIUDADES.length][1];

const ahora = '2026-11-21T15:40:00Z';

// --- Carga ------------------------------------------------------------------

async function registrar(
  v: Valkey,
  unidad: string, programa: string, servicio: string,
  iPersona: number, periodo: string, rol: 'impactada' | 'donante' = 'impactada',
) {
  const id = pid(iPersona);
  const ciudad = ciudadDe(iPersona);
  const pipe = v.pipeline();
  pipe.hincrby(cnt(unidad), campoConteo(programa, ciudad, periodo, servicio), 1);
  pipe.sadd(perTodas(), id);
  pipe.sadd(perPrograma(programa), id);
  pipe.sadd(rol === 'donante' ? perDonantes(programa) : perImpactadas(programa), id);
  pipe.sadd(perCiudad(ciudad), id);
  pipe.sadd(perPeriodo(periodo), id);
  pipe.sadd(perServicio(servicio), id);
  pipe.hincrby(presencia(programa), claveDe(iPersona), 1);
  pipe.hincrby(presencia('global'), claveDe(iPersona), 1);
  await pipe.exec();
}

export async function cargarSemilla(v: Valkey) {
  await limpiar(v, false); // idempotente: siempre parte de la base limpia
  const pipe = v.pipeline();

  // Personas: 150 identificadores opacos, nacimiento y nivel de certeza.
  for (let i = 0; i < N_PERSONAS; i++) {
    pipe.hset(nac(), pid(i), nacimiento(i));
    pipe.sadd(perCerteza(i < 100 ? 'folio' : 'id'), pid(i));
  }
  await pipe.exec();

  // Conteos y membresías.
  // Tamizaje Rosa: 120 atenciones, personas 0..89.
  for (let r = 0; r < 120; r++) {
    const servicio = [S_PAP, S_USG, S_EXP][r % 3];
    await registrar(v, 'atencion', P_TAMIZAJE, servicio, r % 90, PERIODOS[r % 8]);
  }
  // Melenas en Movimiento: 80 filas (60 donaciones de trenza + 20 entregas de
  // peluca), personas 75..149 — las 75..89 también están en Tamizaje Rosa:
  // cruce de 15. Donantes y beneficiarias van a conjuntos distintos.
  for (let r = 0; r < 80; r++) {
    const donacion = r < 60;
    await registrar(
      v, donacion ? 'donacion' : 'producto_entregado', P_MELENAS,
      donacion ? S_TRENZA : S_PELUCA, 75 + (r % 75), PERIODOS[(r * 3) % 8],
      donacion ? 'donante' : 'impactada',
    );
  }
  // Nutrición: 40 atenciones nuevas, personas 90..129.
  for (let r = 0; r < 40; r++) {
    await registrar(v, 'atencion', P_NUTRICION, S_NUT, 90 + r, PERIODOS[(r * 5) % 8]);
  }

  // 20 registros sin persona identificada.
  for (let r = 0; r < 20; r++) {
    const enTamizaje = r < 12;
    await v.hincrby(
      sinid(),
      campoConteo(
        enTamizaje ? P_TAMIZAJE : P_MELENAS,
        CIUDADES[r % 6][0],
        PERIODOS[(r * 2) % 8],
        enTamizaje ? S_EXP : S_TRENZA,
      ),
      1,
    );
  }

  // Fuentes importadas.
  const cargada = (m: number) => new Date(Date.parse('2026-11-21T14:00:00Z') + m * 60000).toISOString();
  const metas: [string, Record<string, string>, number][] = [
    [F_TAMIZAJE, {
      nombre: 'tamizaje-rosa.xlsx', programa: P_TAMIZAJE, unidad: 'atencion',
      fecha_corte: '2026-09-30', cargada_en: cargada(0), por: 'Coord. Tamizaje',
      filas: '132', filas_nuevas: '132', filas_omitidas: '0', inasistencias: '6',
      estrellas: '4', puntaje: '84',
      motivos: JSON.stringify(['12 registros sin persona identificada', '3 anomalías de calidad', '6 inasistencias registradas']),
    }, 0],
    [F_MELENAS, {
      nombre: 'melenas-en-movimiento.xlsx', programa: P_MELENAS, unidad: 'segun_fila',
      fecha_corte: '2026-09-30', cargada_en: cargada(9), por: 'Coord. Melenas en Movimiento',
      filas: '80', filas_nuevas: '80', filas_omitidas: '0', inasistencias: '0',
      estrellas: '3', puntaje: '71',
      motivos: JSON.stringify(['12 registros sin persona identificada', '2 fechas de servicio posteriores al corte']),
    }, 9],
    [F_NUTRICION, {
      nombre: 'nutricion.xlsx', programa: P_NUTRICION, unidad: 'atencion',
      fecha_corte: '2026-08-31', cargada_en: cargada(18), por: 'Coord. Nutrición',
      filas: '70', filas_nuevas: '40', filas_omitidas: '30', inasistencias: '0',
      estrellas: '5', puntaje: '96',
      motivos: JSON.stringify(["30 filas omitidas porque ya estaban en 'tamizaje-rosa.xlsx'", 'Datos completos y consistentes']),
    }, 18],
  ];
  const p2 = v.pipeline();
  for (const [id, campos, min] of metas) {
    p2.zadd(fuentes(), Math.floor(Date.parse(cargada(min)) / 1000), id);
    p2.hset(fuente(id), campos);
  }
  await p2.exec();

  // Anomalías por fuente.
  const anoms: [string, object[]][] = [
    [F_TAMIZAJE, [
      { fila: 17, regla: 'faltante', campo: 'fecha_nacimiento', detalle: 'Fecha de nacimiento vacía' },
      { fila: 44, regla: 'fecha_futura', campo: 'fecha', detalle: 'La fecha de servicio es posterior al corte' },
      { fila: 88, regla: 'ciudad_desconocida', campo: 'ciudad', detalle: 'Municipio no reconocido en el catálogo' },
    ]],
    [F_MELENAS, [
      { fila: 9, regla: 'faltante', campo: 'servicio', detalle: 'Servicio vacío' },
      { fila: 61, regla: 'fecha_futura', campo: 'fecha', detalle: 'La fecha de servicio es posterior al corte' },
    ]],
    [F_NUTRICION, [
      { fila: 5, regla: 'posible_correccion', campo: 'servicio', detalle: 'Texto parecido a «Valoración nutricional»' },
      { fila: 22, regla: 'id_invalido', campo: 'folio', detalle: 'Folio con dígito verificador incorrecto' },
      { fila: 33, regla: 'edad_inconsistente', campo: 'edad', detalle: 'La edad no coincide con la fecha de nacimiento' },
      { fila: 58, regla: 'fila_repetida', campo: '', detalle: 'Fila idéntica a otra dentro del mismo archivo' },
    ]],
  ];
  for (const [id, lista] of anoms) {
    for (const a of lista) await v.rpush(anom(id), JSON.stringify(a));
  }

  // 30 filas de nutricion.xlsx omitidas por ya estar en tamizaje-rosa.xlsx.
  for (let r = 0; r < 30; r++) {
    await v.rpush(omitidas(F_NUTRICION), JSON.stringify({
      fila: 41 + r, ya_en_fuente: F_TAMIZAJE, ya_en_fila: 1 + ((r * 7) % 120),
    }));
  }

  // 5 pares pendientes de decisión humana (etiquetas: iniciales, no nombres).
  const listaPares: [string, string, string, string][] = [
    ['par-01', 'Mismo ID, nombres distintos',
      etiqueta('María Elena López', 'Sayula', 42), etiqueta('María Elena Landa', 'Sayula', 42)],
    ['par-02', 'Mismo ID, nombres distintos',
      etiqueta('Guadalupe Torres', 'Tapalpa', 55), etiqueta('María Guadalupe Torres', 'Tapalpa', 55)],
    ['par-03', 'Posible variante de escritura',
      etiqueta('Carmen Alicia Vega', 'Jocotepec', 38), etiqueta('Carmen Alisia Vega', 'Jocotepec', 38)],
    ['par-04', 'Posible variante de escritura',
      etiqueta('Rosa Isela Mora', 'Zapotlán el Grande', 61), etiqueta('Rosa Izela Mora', 'Zapotlán el Grande', 61)],
    ['par-05', 'Posible variante de escritura',
      etiqueta('Leticia Anaya', 'Gómez Farías', 47), etiqueta('Leticia Anaia', 'Gómez Farías', 47)],
  ];
  for (let i = 0; i < listaPares.length; i++) {
    const [id, motivo, ea, eb] = listaPares[i];
    await v.hset(pares(), id, JSON.stringify({
      id, estado: 'pendiente', motivo,
      a: { fuente: F_TAMIZAJE, fila: 10 + i * 3, etiqueta: ea },
      b: { fuente: F_MELENAS, fila: 20 + i * 5, etiqueta: eb },
    }));
  }

  // 4 trabajos en eira:trabajo:* (también encolados en el stream eira:trabajos).
  const creado = '2026-11-21T14:00:00Z';
  const listaTrabajos: [string, Record<string, string>][] = [
    ['tr-001', {
      estado: 'listo', nombre: 'tamizaje-rosa.xlsx', programa: P_TAMIZAJE, unidad: 'atencion',
      fecha_corte: '2026-09-30', por: 'Coord. Tamizaje', creado_en: creado, terminado_en: '2026-11-21T14:00:42Z',
      mensaje: 'Se agregaron 132 filas.', nivel_duplicado: 'distinto', fuente: F_TAMIZAJE,
      fuente_original: '', filas: '132', filas_nuevas: '132', filas_omitidas: '0', filas_repetidas: '0',
      mapeo: JSON.stringify([
        { encabezado: 'Nombre completo', campo: 'nombre', probabilidad: 0.98 },
        { encabezado: 'Fecha de nac.', campo: 'fecha_nacimiento', probabilidad: 0.95 },
        { encabezado: 'Municipio', campo: 'ciudad', probabilidad: 0.97 },
      ]),
    }],
    ['tr-002', {
      estado: 'listo', nombre: 'melenas-en-movimiento.xlsx', programa: P_MELENAS, unidad: 'segun_fila',
      fecha_corte: '2026-09-30', por: 'Coord. Melenas en Movimiento', creado_en: '2026-11-21T14:09:00Z',
      terminado_en: '2026-11-21T14:09:37Z',
      mensaje: 'Se agregaron 80 filas.', nivel_duplicado: 'distinto', fuente: F_MELENAS,
      fuente_original: '', filas: '80', filas_nuevas: '80', filas_omitidas: '0', filas_repetidas: '0',
      mapeo: JSON.stringify([
        { encabezado: 'Nombre', campo: 'nombre', probabilidad: 0.96 },
        { encabezado: 'Tipo', campo: 'tipo', probabilidad: 0.93 },
      ]),
    }],
    ['tr-003', {
      estado: 'duplicado', nombre: 'tamizaje-rosa.xlsx', programa: P_TAMIZAJE, unidad: 'atencion',
      fecha_corte: '2026-09-30', por: 'Coord. Tamizaje', creado_en: '2026-11-21T14:20:00Z',
      terminado_en: '2026-11-21T14:20:03Z',
      mensaje: "Este archivo ya se cargó el 21 nov como 'tamizaje-rosa.xlsx'. No se vuelve a cargar.",
      nivel_duplicado: 'identico', fuente: '', fuente_original: F_TAMIZAJE,
      filas: '132', filas_nuevas: '0', filas_omitidas: '132', filas_repetidas: '0', mapeo: '[]',
    }],
    ['tr-004', {
      estado: 'listo', nombre: 'tamizaje-rosa-v2.xlsx', programa: P_TAMIZAJE, unidad: 'atencion',
      fecha_corte: '2026-10-31', por: 'Coord. Tamizaje', creado_en: '2026-11-21T14:30:00Z',
      terminado_en: '2026-11-21T14:30:51Z',
      mensaje: "Parece una versión nueva de 'tamizaje-rosa.xlsx': 122 filas ya estaban y se omiten; se agregan 8.",
      nivel_duplicado: 'version_nueva', fuente: '', fuente_original: F_TAMIZAJE,
      filas: '130', filas_nuevas: '8', filas_omitidas: '122', filas_repetidas: '0', mapeo: '[]',
    }],
  ];
  for (const [id, campos] of listaTrabajos) {
    await v.hset(trabajo(id), campos);
    await v.xadd(trabajos(), '*', 'id', id, 'nombre', campos.nombre, 'programa', campos.programa,
      'unidad', campos.unidad, 'fecha_corte', campos.fecha_corte, 'por', campos.por);
  }

  // 8 entradas de bitácora.
  const entradas: [string, string][] = [
    ['carga', "Se cargó 'tamizaje-rosa.xlsx': 132 filas, 120 atenciones identificadas."],
    ['carga', "Se cargó 'melenas-en-movimiento.xlsx': 80 filas, 60 donaciones y 20 entregas."],
    ['duplicado', "Se rechazó 'tamizaje-rosa.xlsx': archivo idéntico ya cargado."],
    ['carga', "Se cargó 'nutricion.xlsx': 70 filas, 40 atenciones nuevas y 30 omitidas."],
    ['version_nueva', "'tamizaje-rosa-v2.xlsx': 122 filas ya estaban; se agregan 8."],
    ['pares', 'Se detectaron 5 pares de personas que podrían ser la misma; esperan decisión.'],
    ['sin_identificar', '20 registros quedaron sin persona identificada.'],
    ['informe', 'Se generó el informe de impacto del periodo 2026-02 a 2026-09.'],
  ];
  for (let i = 0; i < entradas.length; i++) {
    const [tipo, detalle] = entradas[i];
    await v.xadd(bitacora(), '*', 'en', new Date(Date.parse(creado) + i * 90000).toISOString(),
      'por', 'semilla', 'tipo', tipo, 'detalle', detalle);
  }

  // Valores vistos por dimensión (llenan los filtros del frontend).
  const p3 = v.pipeline();
  for (const x of [P_TAMIZAJE, P_MELENAS, P_NUTRICION]) p3.sadd(valores('programa'), x);
  for (const [nombre] of CIUDADES) p3.sadd(valores('ciudad'), nombre);
  for (const x of PERIODOS) p3.sadd(valores('periodo'), x);
  for (const x of [S_PAP, S_USG, S_EXP, S_TRENZA, S_PELUCA, S_NUT]) p3.sadd(valores('servicio'), x);
  await p3.exec();

  // Denominadores públicos: mujeres de 25 a 64 por municipio (INEGI, Censo 2020).
  const csv = readFileSync(new URL('../publicos/jalisco_mun_denominadores_2020.csv', import.meta.url), 'utf8');
  const lineas = csv.trim().split('\n');
  const cols = lineas[0].split(',');
  const iMun = cols.indexOf('nom_mun');
  const iDen = cols.indexOf('mujeres_25_64');
  const nombres = CIUDADES.map(([n]) => n);
  const p4 = v.pipeline();
  for (const linea of lineas.slice(1)) {
    const c = linea.split(',');
    if (nombres.includes(c[iMun])) p4.hset(den('mujeres_25_64'), c[iMun], c[iDen]);
  }
  await p4.exec();

  await v.set(contrato(), '1');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const v = conectar();
  await cargarSemilla(v);
  v.disconnect();
  console.log('Semilla cargada: 3 fuentes, 150 personas, 240 conteos y el resto del contrato.');
}
