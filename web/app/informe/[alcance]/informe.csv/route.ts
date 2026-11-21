import {
  edadPromedioIds, filtrosDe, rolesDe,
  personasEnMasDeUnPrograma, personasPorCiudadIds, resumenTiposDe, sinIdentificar,
} from '@/lib/datos';
import { esAlcance, fechaCorteDe, fuentesDe } from '@/lib/informe';
import { nombrePrograma, pluralTipo } from '@/lib/catalogo';
import { presenciaDe } from '@/lib/territorio';

export const dynamic = 'force-dynamic';

/** Celda CSV: entrecomillada si hace falta; apóstrofo delante si empieza con = + - @. */
function celda(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  if (!esAlcance(a)) return new Response('No encontrado', { status: 404 });
  const alcance = a;
  const esGlobal = alcance === 'global';

  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);

  const { porPrograma: roles, totalImpactadas, idsUnicos, totalDonantes } = await rolesDe(esGlobal ? [] : [alcance]);
  const programaIds = roles.map((p) => p.id);
  const porPrograma = await Promise.all(roles.map(async (p) => ({
    ...p, nombre: nombrePrograma(p.id), resumen: await resumenTiposDe(p.id),
  })));

  const f = await filtrosDe(alcance);
  const [sinId, edad, porCiudad] = await Promise.all([
    sinIdentificar(f),
    edadPromedioIds(idsUnicos, corte),
    personasPorCiudadIds(idsUnicos),
  ]);

  const nombres = fuentes.valor.map((x) => x.nombre).join('; ') || 'sin archivos';
  const advert = 'Datos ficticios de demostración; tipos de registro no sumables entre sí; valores de personas menores a 5 se muestran como <5';

  const filas: (string | number)[][] = [
    ['indicador', 'valor', 'unidad', 'definicion', 'fecha_corte', 'fuentes', 'advertencias'],
    ['donantes', totalDonantes > 0 && totalDonantes < 5 ? '<5' : totalDonantes, 'persona', 'Personas identificadas que donaron, contadas una sola vez', corte, nombres, advert],
    [
      'personas_impactadas', totalImpactadas, 'persona',
      esGlobal
        ? 'Suma de las personas impactadas de cada programa (quien está en dos cuenta dos veces)'
        : 'Personas únicas identificadas que cuentan como impactadas, sin duplicados',
      corte, nombres, advert,
    ],
    [
      'personas_impactadas_maximo', totalImpactadas + sinId.valor, 'persona',
      `Personas impactadas más ${sinId.valor} registros sin identificar: el total real está entre ambas cifras`,
      corte, nombres, advert,
    ],
    [
      'edad_promedio', edad.valor.promedio ?? '', 'años',
      `Edad promedio de ${edad.valor.n} personas con fecha de nacimiento registrada`,
      corte, nombres, advert,
    ],
  ];

  if (esGlobal) {
    const enAmbos = (await personasEnMasDeUnPrograma(programaIds)).valor;
    filas.push([
      'personas_en_mas_de_un_programa', enAmbos, 'persona',
      'Personas presentes en más de un programa (dato informativo; no se resta del total)',
      corte, nombres, advert,
    ]);
    for (const p of porPrograma) {
      filas.push([
        `personas_impactadas_${p.id}`, p.ids.length, 'persona',
        `Personas impactadas de «${p.nombre}»`,
        corte, nombres, advert,
      ]);
    }
  }

  for (const p of porPrograma) {
    for (const r of p.resumen) {
      filas.push([
        `${r.tipo}_${p.id}`, r.conteo, r.tipo,
        `Registros del tipo «${pluralTipo(r.tipo)}» en ${p.nombre}`,
        corte, nombres, advert,
      ]);
      if (r.personas !== null) {
        filas.push([
          `personas_${r.tipo}_${p.id}`, r.personas < 5 ? '<5' : r.personas, 'persona',
          `Personas únicas con registros de tipo «${pluralTipo(r.tipo)}» en ${p.nombre}${r.cuenta ? '' : ' (no cuentan como impactadas)'}`,
          corte, nombres, advert,
        ]);
      }
    }
    if (p.donantes.length > 0) {
      filas.push([
        `donantes_${p.id}`, p.donantes.length < 5 ? '<5' : p.donantes.length, 'persona',
        `Personas que donaron en ${p.nombre}`,
        corte, nombres, advert,
      ]);
    }
  }

  for (const c of porCiudad.valor) {
    if (c.personas === 0) continue;
    filas.push([
      `personas_${c.ciudad}`, c.personas < 5 ? '<5' : c.personas, 'persona',
      `Personas únicas en ${c.ciudad}`,
      corte, nombres, advert,
    ]);
  }

  const presencia = await presenciaDe(alcance);
  if (presencia) {
    filas.push([
      'presencia_municipios', presencia.municipios, 'municipio',
      `Presencia en ${presencia.municipios} municipios de ${presencia.estados.length} ${presencia.estados.length === 1 ? 'estado' : 'estados'}`,
      corte, nombres, advert,
    ]);
    for (const e of presencia.estados) {
      for (const m of e.activos) {
        filas.push([
          `registros_municipio_${m.clave}`, m.registros, 'registro',
          `Registros en ${m.nombre}, ${e.estado}`,
          corte, nombres, advert,
        ]);
      }
    }
  }

  const csv = '﻿' + filas.map((r) => r.map(celda).join(',')).join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="informe-eira-${alcance}.csv"`,
    },
  });
}
