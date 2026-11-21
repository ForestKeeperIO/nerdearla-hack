// Caso 3: subir un archivo real por la interfaz crea el trabajo en Valkey
// (eira:trabajo:<id> pendiente, eira:archivo:<id> con bytes, mensaje en
// eira:trabajos) con programa = id del catálogo. Rechaza .xlsm y >10 MB.
import { expect, test } from '@playwright/test';
import { limpiar, scan, valkey, xlsxMinimo } from './ayudas';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

test.beforeEach(async () => {
  await limpiar();
});

test('subir un .xlsx por la interfaz encola el trabajo en Valkey', async ({ page }) => {
  await page.goto('/informe/tamizaje-rosa/subir');

  const buffer = xlsxMinimo([
    ['Nombre', 'Estudio', 'Edad', 'Ciudad', 'ID'],
    ['A B C', 'Papanicolaou', '42', 'Sayula', 'ABC19840412'],
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'atenciones-tamizaje.xlsx',
    mimeType: XLSX_MIME,
    buffer,
  });
  await expect(page.getByText('atenciones-tamizaje.xlsx')).toBeVisible();

  await page.getByRole('button', { name: /Subir 1 archivo/ }).click();
  await expect(page.getByText('Recibido', { exact: true })).toBeVisible();

  // El trabajo existe en Valkey: hash pendiente, bytes del archivo y mensaje en el Stream.
  const v = valkey();
  try {
    const ids = await scan(v, 'eira:trabajo:*');
    expect(ids.length).toBeGreaterThan(0);

    let encontrado: Record<string, string> | null = null;
    let idTrabajo = '';
    for (const clave of ids) {
      const h = await v.hgetall(clave);
      if (h.nombre === 'atenciones-tamizaje.xlsx') {
        encontrado = h;
        idTrabajo = clave.slice('eira:trabajo:'.length);
      }
    }
    expect(encontrado, 'debe existir eira:trabajo:<id> para el archivo subido').not.toBeNull();
    expect(encontrado!.estado).toBe('pendiente');
    expect(encontrado!.programa).toBe('tamizaje-rosa'); // id del catálogo, no el nombre

    const bytes = await v.getBuffer(`eira:archivo:${idTrabajo}`);
    expect(bytes, 'debe existir eira:archivo:<id> con los bytes').not.toBeNull();
    expect(bytes!.length).toBe(buffer.length);

    const mensajes = await v.xrange('eira:trabajos', '-', '+');
    const campos = mensajes.map(([, f]) => {
      const m: Record<string, string> = {};
      for (let i = 0; i < f.length; i += 2) m[f[i]] = f[i + 1];
      return m;
    });
    const enStream = campos.find((m) => m.id === idTrabajo);
    expect(enStream, 'debe haber un mensaje en eira:trabajos con el id del trabajo').toBeTruthy();
    expect(enStream!.nombre).toBe('atenciones-tamizaje.xlsx');
    expect(enStream!.programa).toBe('tamizaje-rosa');
  } finally {
    v.disconnect();
  }
});

test('rechaza un .xlsm con mensaje para la usuaria', async ({ page }) => {
  await page.goto('/informe/tamizaje-rosa/subir');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'reporte-con-macros.xlsm',
    mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    buffer: xlsxMinimo([['a']]),
  });

  await expect(page.getByText('reporte-con-macros.xlsm')).toBeVisible();
  await expect(page.getByText(/No se subió/)).toBeVisible();
  await expect(page.getByText('Solo se aceptan .xlsx o .csv.')).toBeVisible();
});

test('rechaza un archivo de más de 10 MB con mensaje', async ({ page }) => {
  await page.goto('/informe/tamizaje-rosa/subir');

  const grande = Buffer.alloc(11 * 1024 * 1024, 0x41);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'gigante.xlsx',
    mimeType: XLSX_MIME,
    buffer: grande,
  });

  await expect(page.getByText('gigante.xlsx')).toBeVisible();
  await expect(page.getByText(/Pesa más de 10 MB/)).toBeVisible();
});
