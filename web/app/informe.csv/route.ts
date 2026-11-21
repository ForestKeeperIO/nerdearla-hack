import {
  conteoUnidad, edadPromedio, fechaCorteActual, listarFuentes, NOMBRE_UNIDAD,
  personasPorCiudad, personasUnicas, sinIdentificar, unidadesConDatos,
} from '@/lib/datos';

export const dynamic = 'force-dynamic';

/** Celda CSV: entrecomillada si hace falta; apóstrofo delante si empieza con = + - @. */
function celda(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const f = {};
  const [fuentes, unidades, personas, sinId, corte, porCiudad] = await Promise.all([
    listarFuentes(), unidadesConDatos(), personasUnicas(f), sinIdentificar(f),
    fechaCorteActual(), personasPorCiudad(f),
  ]);
  const edad = await edadPromedio(f, corte);
  const conteos = await Promise.all(unidades.valor.map((u) => conteoUnidad(u, f)));

  const nombres = fuentes.valor.map((x) => x.nombre).join('; ') || 'sin archivos';
  const advert = 'Datos ficticios de demostración; unidades no sumables entre sí; valores de personas menores a 5 se muestran como <5';

  const filas: (string | number)[][] = [
    ['indicador', 'valor', 'unidad', 'definicion', 'fecha_corte', 'fuentes', 'advertencias'],
    [
      'personas_identificadas', personas.valor, 'persona',
      'Personas únicas identificadas, sin duplicados (SINTERCARD sobre eira:per:*)',
      corte, nombres, advert,
    ],
    [
      'personas_impactadas_maximo', personas.valor + sinId.valor, 'persona',
      `Personas identificadas más ${sinId.valor} registros sin identificar: el total real está entre ambas cifras`,
      corte, nombres, advert,
    ],
    [
      'edad_promedio', edad.valor.promedio ?? '', 'años',
      `Edad promedio de ${edad.valor.n} personas con fecha de nacimiento registrada`,
      corte, nombres, advert,
    ],
  ];

  for (let i = 0; i < unidades.valor.length; i++) {
    const u = unidades.valor[i];
    filas.push([
      NOMBRE_UNIDAD[u].toLowerCase(), conteos[i].valor, u,
      `Registros de la unidad «${NOMBRE_UNIDAD[u]}» en los archivos importados`,
      corte, nombres, advert,
    ]);
  }

  for (const c of porCiudad.valor) {
    filas.push([
      `personas_${c.ciudad}`, c.personas < 5 ? '<5' : c.personas, 'persona',
      `Personas únicas en ${c.ciudad}`,
      corte, nombres, advert,
    ]);
  }

  const csv = '﻿' + filas.map((r) => r.map(celda).join(',')).join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="informe-eira.csv"',
    },
  });
}
