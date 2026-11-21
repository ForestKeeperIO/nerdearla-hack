// Catálogo de iniciativas y tipos de registro de EIRA (catalogos/iniciativas.json).
// Se lee una vez en el servidor; el navegador recibe solo lo que la página le pasa.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TipoRegistro = {
  clave: string;
  etiqueta: string;
  plural: string;
  cuenta_personas: boolean;
};

export type Rol = { clave: string; etiqueta: string; cuenta_como_impactada: boolean };

export type Iniciativa = {
  id: string;
  nombre: string;
  clase: string;
  descripcion: string;
  tipos_de_registro: string[];
  rol_por_defecto: string | null;
  roles_por_tipo?: Record<string, string>;
  estado: 'confirmado' | 'por_confirmar';
  en_demo: boolean;
  solo_entorno?: string;
};

type Catalogo = { tipos_de_registro: TipoRegistro[]; roles_de_persona: Rol[]; iniciativas: Iniciativa[] };

let cache: Catalogo | null = null;

export function catalogo(): Catalogo {
  if (cache) return cache;
  const candidatos = [
    join(process.cwd(), '..', 'catalogos', 'iniciativas.json'),
    join(process.cwd(), 'catalogos', 'iniciativas.json'),
  ];
  for (const ruta of candidatos) {
    try {
      cache = JSON.parse(readFileSync(/* turbopackIgnore: true */ ruta, 'utf8')) as Catalogo;
      return cache;
    } catch {
      // intenta la siguiente ruta
    }
  }
  throw new Error('No se encontró catalogos/iniciativas.json');
}

/** Entorno en marcha: 'blanco' | 'real' (variable ENTORNO). */
export function entorno(): string {
  return process.env.ENTORNO ?? 'blanco';
}

/**
 * Informes que salen en la portada: los marcados en_demo más los del entorno
 * en marcha (solo_entorno = 'real' aparece solo cuando ENTORNO=real).
 * Nada de ids fijos: agregar un informe es agregar una entrada al catálogo.
 */
export function informesActivos(): Iniciativa[] {
  const env = entorno();
  return catalogo().iniciativas.filter((i) => i.en_demo || i.solo_entorno === env);
}

/** Programas del demo (en_demo): son los que abren al Global. */
export function programasDemo(): Iniciativa[] {
  return catalogo().iniciativas.filter((i) => i.en_demo);
}

export function iniciativa(id: string): Iniciativa | undefined {
  return catalogo().iniciativas.find((i) => i.id === id);
}

export function nombrePrograma(id: string): string {
  return iniciativa(id)?.nombre ?? id;
}

/** Los valores que puede traer el campo `programa` de una fuente o conteo: el id o el nombre. */
export function valoresPrograma(id: string): string[] {
  const ini = iniciativa(id);
  return ini ? [ini.id, ini.nombre] : [id];
}

/** Tipos de registro que admite un programa, en el orden del catálogo. */
export function tiposDe(id: string): TipoRegistro[] {
  const ini = iniciativa(id);
  const claves = ini?.tipos_de_registro ?? [];
  const todos = catalogo().tipos_de_registro;
  return claves.map((c) => todos.find((t) => t.clave === c)).filter((t): t is TipoRegistro => !!t);
}

export function etiquetaTipo(clave: string): string {
  return catalogo().tipos_de_registro.find((t) => t.clave === clave)?.etiqueta ?? clave;
}

export function pluralTipo(clave: string): string {
  return catalogo().tipos_de_registro.find((t) => t.clave === clave)?.plural ?? clave;
}

export function tipoRegistro(clave: string): TipoRegistro | undefined {
  return catalogo().tipos_de_registro.find((t) => t.clave === clave);
}

/** Rol de la persona en un tipo de registro de un programa (roles_por_tipo o rol_por_defecto). */
export function rolDe(programaId: string, tipoClave: string): Rol | undefined {
  const ini = iniciativa(programaId);
  const clave = ini?.roles_por_tipo?.[tipoClave] ?? ini?.rol_por_defecto;
  return catalogo().roles_de_persona.find((r) => r.clave === clave);
}

/** Plural sencillo de una etiqueta de rol: 'Donante' → 'donantes'. */
export function pluralRol(rol: Rol | undefined): string {
  return (rol?.etiqueta ?? 'Persona').toLowerCase() + 's';
}
