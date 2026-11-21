// Tipos y constantes compartidas entre servidor y navegador.
// No importa nada de servidor: seguro para componentes de cliente.

export type Med<T> = { valor: T; comando: string; ms: number };

/** Toda cifra de personas menor a 5 se muestra como "<5". */
export function personasTxt(n: number): string {
  return n < 5 ? '<5' : n.toLocaleString('es-MX');
}

/** Fecha ISO → dd/mm/aaaa (la usuaria espera el orden latinoamericano). */
export function fechaEs(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export type Filtros = {
  programa?: string;
  /** Otro valor aceptado para el mismo programa (la semilla vieja usa el nombre, la nueva el id). */
  programaAlt?: string;
  ciudad?: string;
  periodo?: string;
  servicio?: string;
};

/** Clave de tipo de registro del catálogo (atencion, donacion, …). Los nombres salen del catálogo. */
export type Unidad = string;

export type Trabajo = {
  id: string;
  estado: string;
  nombre: string;
  programa: string;
  unidad: string;
  fecha_corte: string;
  por: string;
  creado_en: string;
  terminado_en: string;
  mensaje: string;
  nivel_duplicado: string;
  fuente: string;
  fuente_original: string;
  filas: number;
  filas_nuevas: number;
  filas_omitidas: number;
  filas_repetidas: number;
  mapeo?: { encabezado: string; campo: string }[];
};

export type Fuente = {
  id: string;
  nombre: string;
  programa: string;
  unidad: string;
  fecha_corte: string;
  cargada_en: string;
  por: string;
  filas: number;
  filas_nuevas: number;
  filas_omitidas: number;
  inasistencias: number;
  estrellas: number;
  puntaje: number;
  motivos: string[];
};

export type Anomalia = { fila: number; regla: string; campo: string; detalle: string };
export type Omitida = { fila: number; ya_en_fuente: string; ya_en_fila: number };
export type Par = {
  id: string;
  estado: string;
  motivo: string;
  a: { fuente: string; fila: number; etiqueta: string };
  b: { fuente: string; fila: number; etiqueta: string };
};
export type EntradaBitacora = { id: string; en: string; por: string; tipo: string; detalle: string };
export type CiudadConteo = { ciudad: string; personas: number };
export type Cobertura = { ciudad: string; personas: number; denominador: number | null };
