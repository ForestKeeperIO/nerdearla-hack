// Estado de cada informe: la clave eira:informe:<alcance> más lo que se ve en Valkey.
import { valkey } from './valkey';
import { informe as claveInforme } from './claves';
import { listarFuentes, listarPares, listarTrabajos } from './datos';
import { informesActivos, nombrePrograma, programasDemo, tiposDe, valoresPrograma } from './catalogo';
import type { Alcance, EstadoRecorrido } from './recorrido';

/** Los informes que se muestran: los del catálogo para este entorno, más el Global. */
export function alcancesDemo(): Alcance[] {
  return [...informesActivos().map((i) => i.id), 'global'];
}

export function esAlcance(s: string): s is Alcance {
  return alcancesDemo().includes(s);
}

export type Informe = {
  fecha_corte: string;
  creado_en: string;
  calidad_resuelta: boolean;
  cifras_aprobadas: boolean;
};

/** El hash eira:informe:<alcance>, con valores por omisión si aún no existe. */
export async function leerInforme(alcance: Alcance): Promise<Informe> {
  const h = await valkey().hgetall(claveInforme(alcance));
  return {
    fecha_corte: h.fecha_corte ?? '',
    creado_en: h.creado_en ?? '',
    calidad_resuelta: h.calidad_resuelta === '1',
    cifras_aprobadas: h.cifras_aprobadas === '1',
  };
}

/** Escribe campos del informe; crea el registro si falta. */
export async function escribirInforme(alcance: Alcance, campos: Record<string, string>): Promise<void> {
  const v = valkey();
  const existe = await v.exists(claveInforme(alcance));
  if (!existe) await v.hset(claveInforme(alcance), 'creado_en', new Date().toISOString());
  if (Object.keys(campos).length) await v.hset(claveInforme(alcance), campos);
}

const esPrograma = (valor: string, id: string) => valoresPrograma(id).includes(valor);

/** Fuentes (archivos importados) del alcance. */
export async function fuentesDe(alcance: Alcance) {
  const todas = await listarFuentes();
  if (alcance === 'global') return todas;
  return { ...todas, valor: todas.valor.filter((f) => esPrograma(f.programa, alcance)) };
}

/** Trabajos del alcance (para Subir y para saber si hay algo procesándose). */
export async function trabajosDe(alcance: Alcance) {
  const todos = await listarTrabajos();
  if (alcance === 'global') return todos;
  return { ...todos, valor: todos.valor.filter((t) => esPrograma(t.programa, alcance)) };
}

/** Pares de personas del alcance: del programa (por la fuente del lado A) o todos en el Global. */
export async function paresDe(alcance: Alcance) {
  const pares = await listarPares();
  if (alcance === 'global') return pares;
  const fuentes = await listarFuentes();
  const programaDe = new Map(fuentes.valor.map((f) => [f.id, f.programa]));
  return {
    ...pares,
    valor: pares.valor.filter((p) => esPrograma(programaDe.get(p.a.fuente) ?? '', alcance)),
  };
}

/** Estado completo del recorrido de un informe. */
export async function estadoRecorrido(alcance: Alcance): Promise<EstadoRecorrido> {
  const [inf, fuentes, trabajos, pares] = await Promise.all([
    leerInforme(alcance),
    fuentesDe(alcance),
    trabajosDe(alcance),
    paresDe(alcance),
  ]);

  let programasConArchivos = 0;
  const programasFaltantes: string[] = [];
  if (alcance === 'global') {
    for (const p of programasDemo()) {
      const tiene = (await fuentesDe(p.id)).valor.length > 0;
      if (tiene) programasConArchivos++;
      else programasFaltantes.push(p.nombre);
    }
  }

  return {
    alcance,
    fuentes: fuentes.valor.length,
    trabajosEnCurso: trabajos.valor.filter((t) => t.estado === 'pendiente' || t.estado === 'procesando').length,
    paresPendientes: pares.valor.filter((p) => p.estado === 'pendiente').length,
    calidadResuelta: inf.calidad_resuelta,
    cifrasAprobadas: inf.cifras_aprobadas,
    programasConArchivos,
    programasFaltantes,
  };
}

/** Tipos de registro que puede traer un informe: los del programa, o todos los del demo en el Global. */
export function tiposDelAlcance(alcance: Alcance): string[] {
  if (alcance !== 'global') return tiposDe(alcance).map((t) => t.clave);
  const visto = new Set<string>();
  for (const p of programasDemo()) for (const t of tiposDe(p.id)) visto.add(t.clave);
  return [...visto];
}

/** Fecha de corte del informe: la guardada, o la más reciente de sus fuentes. */
export async function fechaCorteDe(alcance: Alcance): Promise<string> {
  const inf = await leerInforme(alcance);
  if (inf.fecha_corte) return inf.fecha_corte;
  const fuentes = await fuentesDe(alcance);
  let corte = '';
  for (const f of fuentes.valor) if (f.fecha_corte > corte) corte = f.fecha_corte;
  return corte || new Date().toISOString().slice(0, 10);
}

/** Título del informe para cabeceras y portada. */
export function tituloInforme(alcance: Alcance): string {
  return alcance === 'global' ? 'Global · todos los programas' : nombrePrograma(alcance);
}
