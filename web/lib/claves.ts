// Todas las claves de Valkey del contrato (docs/contrato-valkey.md).
// ÚNICO archivo donde aparece el prefijo "eira:"; el resto importa de aquí.
// Separador de campos compuestos: "|". Fechas AAAA-MM-DD, periodos AAAA-MM.

const P = 'eira:';

/** Patrón para SCAN: todas las claves del proyecto. */
export const patronTodo = () => `${P}*`;

// --- Control ---

/** String `1`: versión del contrato cargada en la base. */
export const contrato = () => `${P}contrato`;

// --- Lo que escribe el frontend ---

/** String binario (caduca en 3600 s): bytes del archivo subido para ese trabajo. */
export const archivo = (trabajoId: string) => `${P}archivo:${trabajoId}`;

/** Stream: un mensaje por archivo subido (id, nombre, programa, unidad, fecha_corte, por). */
export const trabajos = () => `${P}trabajos`;

/** Hash: estado del trabajo (pendiente/procesando/listo/duplicado/error) y sus metadatos. */
export const trabajo = (trabajoId: string) => `${P}trabajo:${trabajoId}`;

/** Stream: decisiones humanas (tipo, par o fuente+fila, decision, por). */
export const decisiones = () => `${P}decisiones`;

// --- Fuentes (lo que escribe Python tras importar) ---

/** Sorted Set: miembro = id de fuente, puntaje = segundos Unix de carga. */
export const fuentes = () => `${P}fuentes`;

/** Hash: nombre, programa, unidad, fecha_corte, cargada_en, por, filas*, estrellas, puntaje, motivos. */
export const fuente = (fuenteId: string) => `${P}fuente:${fuenteId}`;

/** List: un JSON por anomalía { fila, regla, campo, detalle } (detalle sin nombres). */
export const anom = (fuenteId: string) => `${P}anom:${fuenteId}`;

/** List: un JSON por fila omitida { fila, ya_en_fuente, ya_en_fila }. */
export const omitidas = (fuenteId: string) => `${P}omitidas:${fuenteId}`;

// --- Personas (identificadores opacos, uno solo por persona) ---

/** Set: todos los identificadores de persona. */
export const perTodas = () => `${P}per:todas`;

/** Set: personas con al menos un registro en ese programa. */
export const perPrograma = (programa: string) => `${P}per:programa:${programa}`;
export const perImpactadas = (programa: string) => `${P}per:impactadas:${programa}`;
export const perDonantes = (programa: string) => `${P}per:donantes:${programa}`;

/** Set: personas por ciudad. */
export const perCiudad = (ciudad: string) => `${P}per:ciudad:${ciudad}`;

/** Set: personas por periodo AAAA-MM. */
export const perPeriodo = (periodo: string) => `${P}per:periodo:${periodo}`;

/** Set: personas por servicio. */
export const perServicio = (servicio: string) => `${P}per:servicio:${servicio}`;

/** Set: personas por nivel de certeza (`folio` o `id`). */
export const perCerteza = (nivel: string) => `${P}per:certeza:${nivel}`;

/**
 * Set: personas con al menos un registro de ese tipo (atencion, donacion, …).
 * Extensión propuesta del contrato (13:10): hace falta para contar por separado
 * a las personas que solo aportan (donantes) de las que reciben (beneficiarias).
 * Si los conjuntos no existen, el frontend cae a `per:programa`.
 */
export const perTipo = (tipo: string) => `${P}per:tipo:${tipo}`;

/** Hash: identificador de persona → fecha de nacimiento AAAA-MM-DD. */
export const nac = () => `${P}nac`;

// --- Conteos ---

/** Hash: campo "programa|ciudad|AAAA-MM|servicio" → cantidad, por unidad. */
export const cnt = (unidad: string) => `${P}cnt:${unidad}`;

/** Hash: mismo campo que cnt → registros sin persona identificada. */
export const sinid = () => `${P}sinid`;

/** Campo compuesto de cnt/sinid: "programa|ciudad|periodo|servicio" (vacío = desconocido). */
export const campoConteo = (programa: string, ciudad: string, periodo: string, servicio: string) =>
  `${programa}|${ciudad}|${periodo}|${servicio}`;

/** Set: valores vistos de una dimensión (`programa`, `ciudad`, `periodo`, `servicio`). */
export const valores = (dimension: string) => `${P}valores:${dimension}`;

/** Hash: clave de municipio INEGI (5 dígitos) → número de registros, por alcance. */
export const presencia = (alcance: string) => `${P}presencia:${alcance}`;

// --- Decisiones pendientes y bitácora ---

/** Hash: id de par → JSON { id, estado, motivo, a: { fuente, fila, etiqueta }, b: { … } }. */
export const pares = () => `${P}pares`;

/** Stream: bitácora de ajustes (en, por, tipo, detalle). Nunca se recorta. */
export const bitacora = () => `${P}bitacora`;

// --- Aviso en vivo ---

/** Canal Pub/Sub: { "tipo": "trabajo"|"fuente"|"persona", "id": "…" }. */
export const eventos = () => `${P}eventos`;

// --- Lo que carga el frontend por su cuenta ---

/** Hash: ciudad → denominador (p. ej. mujeres_25_64 = mujeres de 25 a 64, INEGI 2020). */
export const den = (dimension: string) => `${P}den:${dimension}`;

/** Hash: estado de cada informe (`fecha_corte`, `creado_en`, `calidad_resuelta`, `cifras_aprobadas`). */
export const informe = (alcance: string) => `${P}informe:${alcance}`;

// Archivo de ediciones publicadas por el frontend; no es el estado del recorrido.
export const reportesGenerados = () => `${P}reportes`;
export const reporteGuardado = (id: string) => `${P}reporte:${id}`;
