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

export type Iniciativa = {
  id: string;
  nombre: string;
  clase: string;
  descripcion: string;
  tipos_de_registro: string[];
  estado: 'confirmado' | 'por_confirmar';
  en_demo: boolean;
};

type Catalogo = { tipos_de_registro: TipoRegistro[]; iniciativas: Iniciativa[] };

let cache: Catalogo | null = null;

export function catalogo(): Catalogo {
  if (cache) return cache;
  const candidatos = [
    join(process.cwd(), '..', 'catalogos', 'iniciativas.json'),
    join(process.cwd(), 'catalogos', 'iniciativas.json'),
  ];
  for (const ruta of candidatos) {
    try {
      cache = JSON.parse(readFileSync(ruta, 'utf8')) as Catalogo;
      return cache;
    } catch {
      // intenta la siguiente ruta
    }
  }
  throw new Error('No se encontró catalogos/iniciativas.json');
}

/** Programas del demo (en_demo = true), en el orden del catálogo. */
export function programasDemo(): Iniciativa[] {
  return catalogo().iniciativas.filter((i) => i.en_demo && i.clase === 'programa');
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
