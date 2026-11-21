import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entorno } from './catalogo';

/** Solo enlaces públicos del entorno elegido; nunca una dirección de la máquina de desarrollo. */
export function impactoPublico(params: Record<string, string[]> = {}): string | null {
  for (const root of ['..', '.']) {
    try {
      const path = join(process.cwd(), root, 'metabase', 'enlaces.json');
      const enlaces = JSON.parse(readFileSync(/* turbopackIgnore: true */ path, 'utf8'));
      const url = new URL(enlaces.entornos[entorno()].impacto);
      if (url.protocol !== 'https:' || /^(localhost$|127\.|\[::1\]$)/i.test(url.hostname)) return null;
      // Las preguntas SQL del tablero aceptan un solo valor por parámetro.
      for (const [key, values] of Object.entries(params)) {
        if (values.length === 1) url.searchParams.set(key, values[0]);
      }
      return url.toString();
    } catch { /* En otro directorio de arranque, o sin enlace publicado. */ }
  }
  return null;
}
