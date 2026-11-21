// Utilidades de las pruebas e2e: Valkey en la base 7 (nunca 0 ni 1, que son de
// los entornos en línea), semilla de demostración y un .xlsx mínimo pero real.
import { execFileSync } from 'node:child_process';
import { Valkey } from 'iovalkey';

export const VALKEY_URL = process.env.E2E_VALKEY_URL ?? 'redis://127.0.0.1:6379/7';

export function valkey(): Valkey {
  return new Valkey(VALKEY_URL);
}

/** Borra solo las claves eira:* de la base de pruebas. */
export async function limpiar(): Promise<void> {
  const v = valkey();
  try {
    let cursor = '0';
    const claves: string[] = [];
    do {
      const [sig, lote] = await v.scan(cursor, 'MATCH', 'eira:*', 'COUNT', 500);
      cursor = sig;
      claves.push(...lote);
    } while (cursor !== '0');
    if (claves.length) await v.del(...claves);
  } finally {
    v.disconnect();
  }
}

/** Carga la semilla de demostración (limpia sola las claves eira:* antes). */
export function semilla(): void {
  execFileSync('npx', ['tsx', 'scripts/semilla-dev.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, VALKEY_URL },
    stdio: 'pipe',
  });
}

/** Todas las claves eira:* que coinciden con un patrón. */
export async function scan(v: Valkey, patron: string): Promise<string[]> {
  let cursor = '0';
  const claves: string[] = [];
  do {
    const [sig, lote] = await v.scan(cursor, 'MATCH', patron, 'COUNT', 500);
    cursor = sig;
    claves.push(...lote);
  } while (cursor !== '0');
  return claves;
}

// --- Un .xlsx mínimo pero válido, construido en la prueba ---------------------

const CRC_TABLA = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) c = CRC_TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** Empaqueta archivos en un zip sin compresión (válido para .xlsx). */
function zip(entradas: [string, Buffer][]): Buffer {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let desplaz = 0;
  for (const [nombre, datos] of entradas) {
    const nb = Buffer.from(nombre, 'utf8');
    const crc = crc32(datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6); // método 0: sin compresión
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nb.length, 26);
    partes.push(local, nb, datos);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(datos.length, 20);
    c.writeUInt32LE(datos.length, 24);
    c.writeUInt16LE(nb.length, 28);
    c.writeUInt32LE(desplaz, 42);
    central.push(Buffer.concat([c, nb]));
    desplaz += 30 + nb.length + datos.length;
  }
  const dir = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(dir.length, 12);
  fin.writeUInt32LE(desplaz, 16);
  return Buffer.concat([...partes, dir, fin]);
}

function columna(i: number): string {
  return String.fromCharCode(65 + i);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Un .xlsx real y pequeño con las filas dadas (todas las celdas como texto). */
export function xlsxMinimo(filas: string[][]): Buffer {
  const xmlFilas = filas
    .map(
      (f, r) =>
        `<row r="${r + 1}">` +
        f.map((celda, c) => `<c r="${columna(c)}${r + 1}" t="inlineStr"><is><t>${esc(celda)}</t></is></c>`).join('') +
        '</row>',
    )
    .join('');
  return zip([
    [
      '[Content_Types].xml',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '</Types>',
      ),
    ],
    [
      '_rels/.rels',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    ],
    [
      'xl/workbook.xml',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
    ],
    [
      'xl/_rels/workbook.xml.rels',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '</Relationships>',
      ),
    ],
    [
      'xl/worksheets/sheet1.xml',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          `<sheetData>${xmlFilas}</sheetData></worksheet>`,
      ),
    ],
  ]);
}
