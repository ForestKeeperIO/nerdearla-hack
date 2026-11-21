import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe } from '@/lib/informe';
import {
  edadPromedioIds, filtrosDe, impactadasIdsDe, noImpactadasIdsDe,
  personasEnMasDeUnPrograma, personasPorCiudadIds, personasTxt, resumenTiposDe,
  sinIdentificar, type Med, type ResumenTipo,
} from '@/lib/datos';
import { nombrePrograma, pluralRol, pluralTipo, programasDemo, rolDe } from '@/lib/catalogo';
import { aprobarCifras } from '@/lib/acciones';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { ComoSeCalculo } from '@/components/como';
import { BarList } from '@/components/ui/bar-list';

export const dynamic = 'force-dynamic';

/** Tablero Metabase del entorno, si la rama metabase ya provisionó. */
function enlaceMetabase(): string | null {
  for (const ruta of [join(process.cwd(), '..', 'metabase', 'enlaces.json'), join(process.cwd(), 'metabase', 'enlaces.json')]) {
    try {
      const j = JSON.parse(readFileSync(/* turbopackIgnore: true */ ruta, 'utf8')) as { impacto?: string };
      if (j.impacto) return j.impacto;
    } catch {
      // sin tablero todavía: la pantalla funciona sin él
    }
  }
  return null;
}

function Cifra({ valor, rotulo, med }: { valor: string; rotulo: string; med?: Med<unknown> }) {
  return (
    <div>
      <p className="cifra">{valor}</p>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>{rotulo}</p>
      {med && <ComoSeCalculo med={med} />}
    </div>
  );
}

type ResumenPrograma = {
  id: string;
  nombre: string;
  ids: string[];
  medIds: Med<string[]>;
  resumen: ResumenTipo[];
  noImpactadas: number;
};

/** Una fila por tipo de registro: cuántos registros y cuántas personas, nunca sumados entre tipos. */
function FilasTipos({ programaId, resumen }: { programaId: string; resumen: ResumenTipo[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {resumen.map((r) => {
        const rol = rolDe(programaId, r.tipo);
        return (
          <li key={r.tipo} className="fila">
            <span className="fila__cuerpo">
              <span style={{ fontWeight: 500 }}>{pluralTipo(r.tipo)}</span>
              {r.personas !== null && (
                <span className="etiqueta" style={{ display: 'block' }}>
                  {personasTxt(r.personas)} {pluralRol(rol)}
                  {!r.cuenta && ' · no cuentan como personas impactadas'}
                </span>
              )}
              {r.personas === null && !r.cuenta && (
                <span className="etiqueta" style={{ display: 'block' }}>no cuentan como personas impactadas</span>
              )}
            </span>
            <span className="fila__dato">
              <strong className="mono" style={{ fontSize: 18 }}>{r.conteo.toLocaleString('es-MX')}</strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function PaginaVistaPrevia({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'vista-previa');
  const esGlobal = alcance === 'global';

  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);
  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join(' · ');

  const demos = programasDemo();
  const programaIds = esGlobal ? demos.map((d) => d.id) : [alcance];

  const porPrograma: ResumenPrograma[] = await Promise.all(
    programaIds.map(async (id) => {
      const [medIds, resumen, noImp] = await Promise.all([
        impactadasIdsDe(id),
        resumenTiposDe(id),
        noImpactadasIdsDe(id),
      ]);
      return {
        id,
        nombre: nombrePrograma(id),
        ids: medIds.valor,
        medIds,
        resumen,
        noImpactadas: noImp.valor.length,
      };
    }),
  );

  // Personas impactadas: en el Global es la SUMA de las de cada programa
  // (quien está en dos programas cuenta dos veces); la unión solo se usa
  // para edad promedio y desglose por ciudad.
  const totalImpactadas = porPrograma.reduce((s, p) => s + p.ids.length, 0);
  const idsUnicos = [...new Set(porPrograma.flatMap((p) => p.ids))];

  const f = await filtrosDe(alcance);
  const [sinId, edad, porCiudad] = await Promise.all([
    sinIdentificar(f),
    edadPromedioIds(idsUnicos, corte),
    personasPorCiudadIds(idsUnicos),
  ]);
  const enAmbos = esGlobal ? await personasEnMasDeUnPrograma(programaIds) : null;

  const rango = sinId.valor > 0
    ? `${personasTxt(totalImpactadas)} – ${personasTxt(totalImpactadas + sinId.valor)}`
    : personasTxt(totalImpactadas);
  const metabase = enlaceMetabase();
  const totalNoImpactadas = porPrograma.reduce((s, p) => s + p.noImpactadas, 0);

  return (
    <MarcoInforme
      estado={estado}
      paso="vista-previa"
      titulo="Vista previa del informe"
      bajada={`Las cifras tal como saldrán. De: ${nombresFuentes || 'sin archivos'} · datos al corte del ${corte}.`}
    >
      {/* Las tres cifras que pidió EIRA */}
      <div className="tarjeta">
        <div className="grid gap-8 sm:grid-cols-3">
          <Cifra
            valor={rango}
            rotulo={
              esGlobal
                ? `personas impactadas (suma de los programas${sinId.valor > 0 ? '; rango: hay registros sin identificar' : ''})`
                : sinId.valor > 0
                  ? 'personas impactadas (rango: hay registros sin identificar)'
                  : 'personas impactadas'
            }
            med={porPrograma[0]?.medIds}
          />
          <Cifra
            valor={edad.valor.promedio === null ? '—' : `${edad.valor.promedio.toLocaleString('es-MX')}`}
            rotulo={edad.valor.promedio === null ? 'edad promedio (sin datos de nacimiento)' : `edad promedio, en años (${edad.valor.n} con fecha de nacimiento)`}
            med={edad}
          />
          {enAmbos ? (
            <Cifra valor={personasTxt(enAmbos.valor)} rotulo="personas aparecen en más de un programa (dato informativo; no se resta)" med={enAmbos} />
          ) : (
            <Cifra valor={String(porCiudad.valor.filter((c) => c.personas > 0).length)} rotulo="ciudades con personas impactadas" />
          )}
        </div>

        <div style={{ marginTop: 'var(--sp-8)' }}>
          <h2 style={{ fontSize: 15 }}>Desglose por ciudad</h2>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <BarList
              datos={porCiudad.valor.filter((c) => c.personas > 0).map((c) => ({ nombre: c.ciudad, valor: c.personas, texto: personasTxt(c.personas) }))}
            />
          </div>
          <ComoSeCalculo med={porCiudad} />
        </div>
      </div>

      {/* Programa: cada tipo de registro por separado */}
      {!esGlobal && porPrograma[0] && porPrograma[0].resumen.length > 0 && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Registros por tipo</h2>
          <FilasTipos programaId={alcance} resumen={porPrograma[0].resumen} />
          <p className="etiqueta" style={{ marginTop: 'var(--sp-3)' }}>
            Son tipos de registro distintos: no se suman entre sí.
            {porPrograma[0].noImpactadas > 0 && (
              <> Las personas que solo aportan ({porPrograma[0].resumen.filter((r) => !r.cuenta).map((r) => pluralRol(rolDe(alcance, r.tipo))).join(', ')}) se muestran aparte y no cuentan como impactadas.</>
            )}
          </p>
        </div>
      )}

      {/* Global: cada programa con sus cifras */}
      {esGlobal && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Cada programa por separado</h2>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>
            El total de arriba es la suma de las personas impactadas de cada programa:
            quien aparece en dos cuenta dos veces. Dentro de un programa cuenta una sola vez.
          </p>
          {porPrograma.map((p) => (
            <div key={p.id} style={{ borderTop: 'var(--border)', marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3>{p.nombre}</h3>
                <p>
                  <strong className="mono" style={{ fontSize: 20 }}>{personasTxt(p.ids.length)}</strong>{' '}
                  <span className="etiqueta">personas impactadas</span>
                </p>
              </div>
              <FilasTipos programaId={p.id} resumen={p.resumen} />
            </div>
          ))}
          {totalNoImpactadas > 0 && (
            <p className="etiqueta" style={{ marginTop: 'var(--sp-4)', borderTop: 'var(--border)', paddingTop: 'var(--sp-3)' }}>
              Aparte de las impactadas: {personasTxt(totalNoImpactadas)} personas solo aportan
              ({porPrograma.filter((p) => p.noImpactadas > 0).map((p) => p.nombre).join(', ')}) — no cuentan como impactadas.
            </p>
          )}
        </div>
      )}

      {metabase && (
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: 15, marginBottom: 'var(--sp-3)' }}>Para mirar más a fondo</h2>
          <iframe
            src={metabase}
            title="Tablero de impacto"
            style={{ width: '100%', height: 560, border: 'var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--superficie)' }}
          />
        </div>
      )}

      <PieDePaso estado={estado} paso="vista-previa">
        <form action={aprobarCifras.bind(null, alcance)}>
          <button type="submit" className="btn btn--primario">Las cifras son correctas</button>
        </form>
      </PieDePaso>
    </MarcoInforme>
  );
}
