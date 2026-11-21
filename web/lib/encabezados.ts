import alias from './alias-encabezados.json';

export type Columna = { encabezado: string; campo?: string; probabilidad?: number };

// SequenceMatcher de Python: primero el bloque común contiguo más largo;
// en empates gana la primera posición en a, luego la primera en b.
function coincidencias(a: string, b: string): number {
  let max = 0, finA = 0, finB = 0;
  let previa = new Uint8Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const fila = new Uint8Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] !== b[j - 1]) continue;
      fila[j] = previa[j - 1] + 1;
      if (fila[j] > max) { max = fila[j]; finA = i; finB = j; }
    }
    previa = fila;
  }
  return max ? max + coincidencias(a.slice(0, finA - max), b.slice(0, finB - max))
    + coincidencias(a.slice(finA), b.slice(finB)) : 0;
}

function probabilidad(n: string, tokens: Set<string>, sinonimo: string) {
  if (n === sinonimo) return 1;
  const palabras = new Set(sinonimo.split(' '));
  if ([...palabras].every(t => tokens.has(t))) return 0.7 + 0.3 * palabras.size / tokens.size;
  const total = n.length + sinonimo.length;
  if (2 * Math.min(n.length, sinonimo.length) / total * 0.95 < alias.umbral) return 0;
  return 2 * coincidencias(n, sinonimo) / total * 0.95;
}

export function mapear(encabezados: string[]): Columna[] {
  const columnas: Columna[] = encabezados.map(encabezado => ({ encabezado: encabezado.trim() }));
  const candidatos: { indice: number; campo: string; p: number }[] = [];
  columnas.forEach(({ encabezado }, indice) => {
    const n = encabezado.normalize('NFD').replace(new RegExp('\\p{Mn}', 'gu'), '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!n) return;
    const tokens = new Set(n.split(' '));
    for (const [campo, opciones] of Object.entries(alias.sinonimos)) {
      const p = Math.max(...opciones.map(s => probabilidad(n, tokens, s)));
      if (p >= alias.umbral) candidatos.push({ indice, campo, p });
    }
  });
  const usados = new Set<string>();
  for (const { indice, campo, p } of candidatos.sort((a, b) => b.p - a.p || a.indice - b.indice)) {
    if (columnas[indice].campo || usados.has(campo)) continue;
    usados.add(campo);
    columnas[indice] = { ...columnas[indice], campo, probabilidad: Number(p.toFixed(2)) };
  }
  return columnas;
}

export type Revision = { columnas: Columna[]; faltan: number };

export async function revisarArchivo(archivo: File): Promise<Revision> {
  const { read, utils } = await import('xlsx');
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const csv = archivo.name.toLowerCase().endsWith('.csv');
  let entrada: Uint8Array | string = bytes;
  let separador: string | undefined;
  if (csv) {
    try { entrada = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { entrada = new TextDecoder('windows-1252').decode(bytes); }
    // SheetJS no detecta automáticamente el separador "|" que admite Selma.
    const linea = entrada.replace(/"(?:[^"]|"")*"/g, '').split(/\r|\n/, 1)[0];
    separador = [',', ';', '\t', '|'].sort((a, b) => linea.split(b).length - linea.split(a).length)[0];
  } else if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Formato de Excel no válido');
  }
  const libro = read(entrada, { type: csv ? 'string' : 'array', FS: separador, sheets: 0, sheetRows: 1, raw: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const rango = hoja?.['!ref'] && utils.decode_range(hoja['!ref']);
  const primera = rango && rango.s.r === 0
    ? Array.from({ length: rango.e.c + 1 }, (_, c) => String(hoja[utils.encode_cell({ r: 0, c })]?.v ?? ''))
    : [];
  const columnas = mapear(primera);
  return { columnas, faltan: Math.max(0, 2 - columnas.filter(c => c.campo).length) };
}
