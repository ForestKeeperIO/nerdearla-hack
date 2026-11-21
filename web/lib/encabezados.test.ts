import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapear, revisarArchivo } from './encabezados';

describe('Revisión local de encabezados', () => {
  it('no asigna el mismo campo dos veces; prefiere el alias exacto a la errata', () => {
    expect(mapear(['MUNICÍPIO', 'Nombree', 'Paciente', 'XXX', 'Asisitencia', 'Total de piezas'])
      .map(c => [c.campo, c.probabilidad])).toEqual([
      ['ciudad', 1], [undefined, undefined], ['nombre', 1], [undefined, undefined], ['asistencia', 0.9], ['cantidad', 0.8],
    ]);
  });
  it.each(['../../reportes/demo/jornada-nueva-chapala.xlsx', '../../datos-de-prueba/jornada-nueva-chapala.csv'])(
    'reconoce los siete encabezados de %s sin enviar el archivo', async ruta => {
      const r = await revisarArchivo(new File([new Uint8Array(readFileSync(new URL(ruta, import.meta.url)))], ruta));
      expect(r.faltan).toBe(0);
      expect(r.columnas.map(c => c.campo)).toEqual(['id_eira', 'nombre', 'estudio', 'edad', 'ciudad', 'asistencia', 'fecha']);
    });
  it('exige dos campos distintos, no dos alias de un mismo campo', async () => {
    const r = await revisarArchivo(new File(['Ciudad|Municipio|"Comentario, libre"\nA|B|C'], 'ejemplo.csv'));
    expect(r.faltan).toBe(1);
    expect(r.columnas[2].encabezado).toBe('Comentario, libre');
  });
});
