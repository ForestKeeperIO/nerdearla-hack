// Presencia territorial: catálogo INEGI de municipios + eira:presencia:<alcance>.
// El bloque dice dónde está EIRA, nunca dónde falta: sin porcentajes de
// cobertura, sin "municipios sin atender", sin colores de alerta.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valkey } from './valkey';
import { presencia } from './claves';

export type Municipio = {
  clave: string;
  municipio: string;
  estado_clave: string;
  estado: string;
};

export type EstadoOpcion = { clave: string; nombre: string };

export type MunicipioActivo = { clave: string; nombre: string; registros: number };

export type EstadoPresencia = {
  estadoClave: string;
  estado: string;
  /** Municipios del estado con actividad, por nombre. */
  activos: MunicipioActivo[];
  /** Todos los municipios del estado (para el mosaico), marcados si tienen actividad. */
  mosaico: { clave: string; activo: boolean }[];
  /** Total de municipios del estado (referencia: "de 125 municipios de Jalisco"). */
  totalEstado: number;
};

export type ResumenPresencia = {
  /** Municipios con actividad en todo el alcance. */
  municipios: number;
  estados: EstadoPresencia[];
};

let cache: Municipio[] | null = null;

/** Catálogo completo del país (2 478 municipios, INEGI). */
export function catalogoMunicipios(): Municipio[] {
  if (cache) return cache;
  for (const ruta of [
    join(process.cwd(), 'publicos', 'municipios_mexico.json'),
    join(process.cwd(), '..', 'publicos', 'municipios_mexico.json'),
  ]) {
    try {
      const j = JSON.parse(readFileSync(/* turbopackIgnore: true */ ruta, 'utf8')) as { municipios: Municipio[] };
      cache = j.municipios;
      return cache;
    } catch {
      // sigue con la siguiente ruta
    }
  }
  return [];
}

/** Estados del catálogo para el selector de Subir (Jalisco primero). */
export function estadosCatalogo(): EstadoOpcion[] {
  const vistos = new Map<string, string>();
  for (const m of catalogoMunicipios()) {
    if (!vistos.has(m.estado_clave)) vistos.set(m.estado_clave, m.estado);
  }
  return [...vistos.entries()]
    .map(([clave, nombre]) => ({ clave, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Resumen de presencia de un alcance (id de programa o `global`).
 * `null` si la clave no existe o viene vacía: el bloque no se muestra.
 */
export async function presenciaDe(alcance: string): Promise<ResumenPresencia | null> {
  const h = await valkey().hgetall(presencia(alcance));
  const entradas = Object.entries(h).filter(([k]) => /^\d{5}$/.test(k));
  if (entradas.length === 0) return null;

  const porClave = new Map(catalogoMunicipios().map((m) => [m.clave, m]));
  const porEstado = new Map<string, { estado: string; activos: MunicipioActivo[] }>();

  for (const [clave, n] of entradas) {
    const m = porClave.get(clave);
    if (!m) continue;
    const e = porEstado.get(m.estado_clave) ?? { estado: m.estado, activos: [] };
    e.activos.push({ clave, nombre: m.municipio, registros: Number(n) || 0 });
    porEstado.set(m.estado_clave, e);
  }
  if (porEstado.size === 0) return null;

  const activosSet = new Set(entradas.map(([k]) => k));
  const estados: EstadoPresencia[] = [...porEstado.entries()].map(([estadoClave, e]) => {
    const todos = catalogoMunicipios().filter((m) => m.estado_clave === estadoClave);
    return {
      estadoClave,
      estado: e.estado,
      activos: e.activos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      mosaico: todos.map((m) => ({ clave: m.clave, activo: activosSet.has(m.clave) })),
      totalEstado: todos.length,
    };
  });
  estados.sort((a, b) => b.activos.length - a.activos.length || a.estado.localeCompare(b.estado, 'es'));

  return {
    municipios: estados.reduce((s, e) => s + e.activos.length, 0),
    estados,
  };
}
