// Folio de paciente: EIRA-XXXX-XXXX. Opaco, sin datos personales.
// 7 caracteres aleatorios + 1 verificador (suma de índices mod 31).
// Sin dependencias de Node: lo usan el servidor y el navegador.

export const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const FORMATO = /^EIRA-([2-9A-HJKMNP-Z]{4})-([2-9A-HJKMNP-Z]{4})$/;

function verificador(cuerpo: string): string {
  let suma = 0;
  for (const c of cuerpo) suma += ALFABETO.indexOf(c);
  return ALFABETO[suma % ALFABETO.length];
}

export function newFolio(): string {
  let cuerpo = '';
  // 31 símbolos: se descartan los bytes >= 248 para no sesgar la elección.
  while (cuerpo.length < 7) {
    const [b] = globalThis.crypto.getRandomValues(new Uint8Array(1));
    if (b < 248) cuerpo += ALFABETO[b % ALFABETO.length];
  }
  const todo = cuerpo + verificador(cuerpo);
  return `EIRA-${todo.slice(0, 4)}-${todo.slice(4)}`;
}

export function isValidFolio(folio: string): boolean {
  const m = FORMATO.exec(folio.trim().toUpperCase());
  if (!m) return false;
  const todo = m[1] + m[2];
  return verificador(todo.slice(0, 7)) === todo[7];
}

export function normalizarFolio(folio: string): string {
  return folio.trim().toUpperCase();
}
