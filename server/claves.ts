// Única fuente de los nombres de claves en Valkey. Ningún otro archivo escribe un literal `imp:`.
import type { UnidadRegistro } from '../shared/types';

export type Dimension = 'programa' | 'municipio' | 'periodo' | 'servicio' | 'certeza' | 'todas';

/** Hash: metadatos de una Fuente. */
export const kFuente = (id: string) => `imp:fuente:${id}`;
/** Set: ids de todas las fuentes. */
export const kFuentes = () => 'imp:fuentes';
/** Set: huellas sha256 de archivos ya importados. */
export const kHuellas = () => 'imp:huellas';
/** Hash: un Registro. */
export const kRegistro = (id: string) => `imp:reg:${id}`;
/** Set: claves de persona para un valor de una dimensión. Con dim 'todas', valor = 'todas'. */
export const kPersonas = (dim: Dimension, valor: string) => `imp:per:${dim}:${valor}`;
/** Set: valores vistos de una dimensión (para poblar filtros). */
export const kValores = (dim: Exclude<Dimension, 'todas' | 'certeza'>) => `imp:val:${dim}`;
/** Hash: campo `<programa>|<municipio>|<periodo>|<servicio>` → suma de cantidad. */
export const kConteo = (unidad: UnidadRegistro) => `imp:cnt:${unidad}`;
/** Hash: mismo campo → número de registros sin persona identificada. */
export const kSinIdentificar = () => 'imp:sinid';
/** Hash: campo `<certeza>` → número de registros (para la métrica Certeza del dato). */
export const kCertezaRegistros = () => 'imp:certeza';
/** List: Anomalia en JSON. */
export const kAnomalias = (fuenteId: string) => `imp:anom:${fuenteId}`;
/** Hash: id de par → ParDuplicado en JSON. */
export const kDuplicados = () => 'imp:dup';
/** Hash: clave de persona → clave canónica. */
export const kAlias = () => 'imp:alias';
/** Stream: cada Ajuste. Nunca se recorta. */
export const kAjustes = () => 'imp:ajustes';
/** Hash: clave de municipio → valor del denominador. */
export const kDenominador = (indicador: string) => `imp:den:${indicador}`;
/** Hash: metadatos del denominador (fuente, anio, etiqueta). */
export const kDenominadorMeta = (indicador: string) => `imp:den-meta:${indicador}`;
/** Sorted Set: municipio → porcentaje de cobertura. */
export const kCobertura = () => 'imp:rank:cobertura';
/** Canal Pub/Sub: cambios para el tablero en vivo. */
export const kEventos = () => 'imp:eventos';
/** String con caducidad: sesión de usuario. */
export const kSesion = (token: string) => `imp:ses:${token}`;

/** Campo de los hashes de conteo. Los valores nulos se guardan como cadena vacía. */
export function campoConteo(p: { programa: string; municipioClave: string | null; periodo: string | null; servicio: string | null }): string {
  return [p.programa, p.municipioClave ?? '', p.periodo ?? '', p.servicio ?? ''].join('|');
}

export function leerCampoConteo(campo: string): { programa: string; municipioClave: string | null; periodo: string | null; servicio: string | null } {
  const [programa, municipio, periodo, servicio] = campo.split('|');
  return { programa, municipioClave: municipio || null, periodo: periodo || null, servicio: servicio || null };
}

export const URL_VALKEY = process.env.VALKEY_URL ?? 'redis://127.0.0.1:6379';
/** Base usada solo por las pruebas; se vacía antes de cada una. */
export const BASE_PRUEBAS = 15;
