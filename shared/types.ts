// Contrato compartido entre servidor y web. Cambiarlo afecta a todas las tareas.

export type Unidad = 'persona' | 'atencion' | 'estudio' | 'participacion' | 'entrega_insumo';
export type UnidadRegistro = Exclude<Unidad, 'persona'>;
export type Certeza = 'verificada' | 'probable' | 'sin_identificar';
export type Role = 'coordinacion' | 'direccion';

export type Campo =
  | 'folio' | 'nombres' | 'apellidos' | 'nombreCompleto' | 'fechaNacimiento'
  | 'municipio' | 'servicio' | 'fecha' | 'cantidad' | 'ignorar';

/** Encabezado original del archivo → campo común. */
export type Mapeo = Record<string, Campo>;

export interface MapeoPropuesto {
  encabezado: string;
  campo: Campo;
  probabilidad: number;
  /** true si la probabilidad es menor a 0.90: una persona debe confirmarlo. */
  porConfirmar: boolean;
}

export interface Fuente {
  id: string;
  nombreArchivo: string;
  /** sha256 del archivo; evita importar dos veces lo mismo. */
  huella: string;
  programa: string;
  unidad: UnidadRegistro;
  /** YYYY-MM-DD */
  fechaCorte: string;
  filas: number;
  mapeo: Mapeo;
  cargadaEn: string;
}

export interface Registro {
  id: string;
  fuenteId: string;
  fila: number;
  programa: string;
  unidad: UnidadRegistro;
  servicio: string | null;
  /** YYYY-MM-DD */
  fecha: string | null;
  /** YYYY-MM */
  periodo: string | null;
  /** Clave INEGI de 5 dígitos. */
  municipioClave: string | null;
  /** `id:<folio>` (verificada), `nf:<hmac>` (probable) o null. */
  personaClave: string | null;
  certeza: Certeza;
  cantidad: number;
}

export type ReglaCalidad =
  | 'faltante' | 'fecha_invalida' | 'fecha_futura' | 'municipio_desconocido'
  | 'duplicado_probable' | 'folio_invalido' | 'discrepancia_total';

export interface Anomalia {
  id: string;
  fuenteId: string;
  fila: number;
  regla: ReglaCalidad;
  campo: string | null;
  detalle: string;
}

export interface Filtro {
  programa?: string;
  /** YYYY-MM, inclusivo */
  periodoDesde?: string;
  /** YYYY-MM, inclusivo */
  periodoHasta?: string;
  municipioClave?: string;
  servicio?: string;
}

export interface Indicador {
  clave: string;
  etiqueta: string;
  valor: number | '<5';
  unidad: Unidad;
  definicion: string;
  fechaCorte: string;
  fuentes: string[];
  denominador: { valor: number; etiqueta: string; fuente: string; anio: number } | null;
  porcentaje: number | null;
  advertencias: string[];
  /** Comando de Valkey que produjo el valor y cuánto tardó. */
  calculo: { comando: string; ms: number };
}

export interface PersonasUnicas {
  /** Identificadas por folio. */
  verificadas: number;
  /** Identificadas por nombre + fecha de nacimiento, tras decisiones confirmadas. */
  probables: number;
  registrosSinIdentificar: number;
  /** verificadas + probables */
  minimo: number;
  /** minimo + registrosSinIdentificar */
  maximo: number;
  advertencias: string[];
}

/** Métrica principal del tablero, calculada sobre registros (no sobre personas). */
export interface CertezaDato {
  verificada: number;
  probable: number;
  sinIdentificar: number;
  porcentajeVerificado: number;
}

export interface Cruce {
  programaA: string;
  programaB: string;
  enAmbos: number;
  soloA: number;
  soloB: number;
  advertencias: string[];
}

export interface FilaCobertura {
  municipioClave: string;
  municipio: string;
  personas: number | '<5';
  denominador: number;
  porcentaje: number | null;
}

export interface ParDuplicado {
  id: string;
  claveA: string;
  claveB: string;
  motivo: string;
  estado: 'pendiente' | 'misma' | 'distinta';
}

export interface Ajuste {
  id: string;
  en: string;
  por: string;
  tipo: 'importacion' | 'mapeo' | 'duplicado' | 'correccion' | 'asistencia_nfc';
  detalle: string;
}

export interface RespuestaIndicadores {
  indicadores: Indicador[];
  personas: PersonasUnicas;
  certeza: CertezaDato;
  cruces: Cruce[];
  cobertura: FilaCobertura[];
}

/** Umbral bajo el cual una decisión automática se marca "por confirmar". */
export const UMBRAL_CONFIRMAR = 0.9;
/** Las celdas de personas con valor menor a este se muestran como '<5'. */
export const UMBRAL_SUPRESION = 5;
