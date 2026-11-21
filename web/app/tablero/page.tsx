// Tablero global con filtros multi-selección (headless: datos y semántica,
// sin dirección visual). Los filtros viven en la URL y alimentan las mismas
// funciones de indicadores que el resto de la app. Corte, fuente y "cómo se
// calculó" siempre visibles; las unidades NUNCA se suman entre sí.
import { Suspense } from 'react';
import Link from 'next/link';
import { FiltrosBarra } from '@/components/filtros-barra';
import { ComoSeCalculo } from '@/components/como';
import { BarList } from '@/components/ui/bar-list';
import {
  conteoUnidadMulti, edadPromedioMulti, filtrosDeQuery, hayFiltros,
  personasPorCiudadMulti, personasUnicasMulti,
} from '@/lib/filtros';
import { valoresDe, sinIdentificar } from '@/lib/datos';
import { fechaCorteDe, paresDe } from '@/lib/informe';
import { personasTxt } from '@/lib/comun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

/** Dashboard público de Metabase (metabase/enlaces.json). El embed público
    acepta los parámetros programa, mes, municipio y servicio; se alimentan
    desde la misma barra de filtros. */
const PARAM_DIM: Record<string, string> = {
  programa: 'programa',
  periodo: 'mes',
  ciudad: 'municipio',
  servicio: 'servicio',
};

function enlaceMetabase(f: { programa: string[]; ciudad: string[]; periodo: string[]; servicio: string[] }): string | null {
  for (const ruta of [join(process.cwd(), '..', 'metabase', 'enlaces.json'), join(process.cwd(), 'metabase', 'enlaces.json')]) {
    try {
      const j = JSON.parse(readFileSync(ruta, 'utf8')) as Record<string, string>;
      const base = j.impacto;
      if (!base) return null;
      const q = new URLSearchParams();
      for (const [dim, param] of Object.entries(PARAM_DIM)) {
        for (const v of f[dim as keyof typeof f]) q.append(param, v);
      }
      const qs = q.toString();
      return qs ? `${base}?${qs}` : base;
    } catch { /* siguiente ruta */ }
  }
  return null;
}

const UNIDADES: { id: string; rotulo: string }[] = [
  { id: 'atencion', rotulo: 'Atenciones' },
  { id: 'estudio', rotulo: 'Estudios' },
  { id: 'participacion', rotulo: 'Participaciones' },
  { id: 'entrega_insumo', rotulo: 'Entregas de insumo' },
];

export default async function Tablero({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = filtrosDeQuery(sp);
  const corte = await fechaCorteDe('global');

  const [opcPrograma, opcCiudad, opcPeriodo, opcServicio, personas, edad, porCiudad, pares, sinId, ...unidades] =
    await Promise.all([
      valoresDe('programa'), valoresDe('ciudad'), valoresDe('periodo'), valoresDe('servicio'),
      personasUnicasMulti(f), edadPromedioMulti(f, corte), personasPorCiudadMulti(f),
      paresDe('global'), sinIdentificar({}),
      ...UNIDADES.map((u) => conteoUnidadMulti(u.id, f)),
    ]);
  const pendientes = pares.valor.filter((p) => p.estado === 'pendiente').length;
  const metabase = enlaceMetabase(f);

  return (
    <div>
      <p className="etiqueta mono" style={{ letterSpacing: '0.02em' }}>Global · todos los programas</p>
      <h1 className="mt-2">Tablero de impacto</h1>
      <p className="lead mt-3" style={{ maxWidth: '58ch' }}>
        Las cifras exactas de personas y servicios al corte del {corte}.
        Filtra por programa, municipio, periodo o tipo de servicio.
      </p>

      <Suspense fallback={<p className="etiqueta">Cargando filtros…</p>}>
        <FiltrosBarra
          opciones={{
            programa: opcPrograma.valor,
            ciudad: opcCiudad.valor,
            periodo: opcPeriodo.valor,
            servicio: opcServicio.valor,
          }}
          activos={f}
        />
      </Suspense>

      {/* Advertencias de calidad: lo que falta por decidir antes de confiar en la cifra. */}
      {(pendientes > 0 || sinId.valor > 0) && (
        <section aria-label="Advertencias de calidad" role="alert" className="estado estado--aviso mt-6" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)' }}>
          {pendientes > 0 && <span>{pendientes} {pendientes === 1 ? 'par posiblemente duplicado' : 'pares posiblemente duplicados'} por decidir.</span>}
          {sinId.valor > 0 && <span>{sinId.valor} {sinId.valor === 1 ? 'registro no identificado' : 'registros no identificados'} (no cuentan como personas).</span>}
          <Link href="/informe/tamizaje-rosa/calidad" className="btn btn--secundario btn--sm no-underline" style={{ marginLeft: 'auto' }}>
            Revisar en Calidad
          </Link>
        </section>
      )}

      <section aria-label="Indicadores" className="tarjeta mt-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="banda-cifras">
          <div>
            <p className="cifra">{personasTxt(personas.valor)}</p>
            <p className="rotulo-cifra">personas alcanzadas{hayFiltros(f) ? ' (con filtros)' : ''}</p>
            <ComoSeCalculo med={personas} />
          </div>
          <div>
            <p className="cifra">{edad.valor.promedio === null ? '—' : edad.valor.promedio.toFixed(1)}</p>
            <p className="rotulo-cifra">edad promedio{edad.valor.n > 0 ? ` (n=${edad.valor.n})` : ''} al {corte}</p>
            <ComoSeCalculo med={edad} />
          </div>
          <div>
            <p className="cifra">{porCiudad.valor.filter((c) => c.personas > 0).length}</p>
            <p className="rotulo-cifra">municipios con personas</p>
          </div>
        </div>
        <div style={{ borderTop: 'var(--border)', padding: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: 15 }}>Servicios por unidad</h2>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>
            Las unidades no se suman entre sí: cada una cuenta una cosa distinta.
          </p>
          <table style={{ width: '100%', marginTop: 'var(--sp-3)', fontSize: 'var(--fs-small)' }}>
            <tbody>
              {UNIDADES.map((u, i) => (
                <tr key={u.id} style={{ borderTop: 'var(--border)' }}>
                  <td style={{ padding: 'var(--sp-2) 0' }}>{u.rotulo}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: 'var(--sp-2) 0' }}>{unidades[i].valor.toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ borderTop: 'var(--border)', padding: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: 15 }}>Desglose por municipio</h2>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <BarList
              datos={porCiudad.valor.filter((c) => c.personas > 0).map((c) => ({ nombre: c.ciudad, valor: c.personas, texto: personasTxt(c.personas) }))}
            />
          </div>
          <ComoSeCalculo med={porCiudad} />
        </div>
      </section>

      {/* Gráficas: el tablero público de Metabase, embebido. Recibe los
          filtros activos como parámetros (programa→programa, municipio→
          municipio, periodo→mes, servicio→servicio). */}
      {metabase && (
        <section aria-label="Gráficas" className="mt-8">
          <h2 style={{ fontSize: 15 }}>Gráficas del tablero</h2>
          <iframe
            src={metabase}
            title="Tablero público de impacto en Metabase"
            style={{ width: '100%', minHeight: 520, border: 'var(--border)', borderRadius: 'var(--r-md)', marginTop: 'var(--sp-3)', background: 'var(--superficie)' }}
          />
          <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
            El dashboard público recibe los filtros de la barra como parámetros de URL
            (programa, municipio, mes y servicio).
          </p>
        </section>
      )}

      <p className="etiqueta mt-6">
        Fuente: reportes Excel de las coordinaciones (ficticios de demostración) ·{' '}
        <Link href="/informe" style={{ color: 'inherit', textDecoration: 'underline' }}>Ver informes</Link>
      </p>
    </div>
  );
}
