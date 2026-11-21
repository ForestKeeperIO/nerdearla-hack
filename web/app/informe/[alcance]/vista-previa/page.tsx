import { impactoPublico } from '@/lib/metabase';
import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe } from '@/lib/informe';
import {
  edadPromedioIds, filtrosDe, rolesDe,
  personasEnMasDeUnPrograma, personasTxt, resumenTiposDe,
  sinIdentificar, type ResumenTipo,
} from '@/lib/datos';
import { fechaEs } from '@/lib/comun';
import { nombrePrograma, pluralRol, pluralTipo, rolDe } from '@/lib/catalogo';
import { aprobarCifras } from '@/lib/acciones';
import { presenciaDe } from '@/lib/territorio';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { PresenciaTerritorial } from '@/components/presencia';

export const dynamic = 'force-dynamic';

function Cifra({ valor, rotulo, regla }: { valor: string; rotulo: string; regla: string }) {
  return (
    <div>
      <p className="cifra">{valor}</p>
      <p className="rotulo-cifra">{rotulo}</p>
      <details className="calculo"><summary>Cómo se calculó</summary><p>{regla}</p></details>
    </div>
  );
}

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

  const { porPrograma: roles, totalImpactadas, idsUnicos, totalDonantes } = await rolesDe(esGlobal ? [] : [alcance]);
  const programaIds = roles.map((p) => p.id);
  const porPrograma = await Promise.all(roles.map(async (p) => ({
    ...p, nombre: nombrePrograma(p.id), resumen: await resumenTiposDe(p.id),
  })));

  const f = await filtrosDe(alcance);
  const [sinId, edad, presencia] = await Promise.all([
    sinIdentificar(f),
    edadPromedioIds(idsUnicos, corte),
    presenciaDe(alcance),
  ]);
  const enAmbos = esGlobal ? await personasEnMasDeUnPrograma(programaIds) : null;

  const rango = sinId.valor > 0
    ? `${personasTxt(totalImpactadas)} – ${personasTxt(totalImpactadas + sinId.valor)}`
    : personasTxt(totalImpactadas);
  const metabase = impactoPublico({ programa: esGlobal ? [] : [alcance] });

  return (
    <MarcoInforme
      estado={estado}
      paso="vista-previa"
      titulo="Vista previa del informe"
      bajada={`Las cifras tal como saldrán. De: ${nombresFuentes || 'sin archivos'} · datos al corte del ${fechaEs(corte)}.`}
    >
      {/* Las tres cifras que pidió EIRA */}
      <div className="tarjeta" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="banda-cifras">
          <Cifra
            valor={personasTxt(totalImpactadas)}
            rotulo={esGlobal ? 'personas impactadas identificadas (suma por programa)' : 'personas impactadas identificadas'}
            regla={`Cada persona identificada cuenta una vez por programa en el que recibió atención o participó. Corte: ${fechaEs(corte)}.`}
          />
          <Cifra
            valor={edad.valor.promedio === null ? '—' : `${edad.valor.promedio.toLocaleString('es-MX')}`}
            rotulo={edad.valor.promedio === null ? 'edad promedio (sin datos de nacimiento)' : `edad promedio, en años (${edad.valor.n} con fecha de nacimiento)`}
            regla={`Promedio de las edades al ${fechaEs(corte)}, sin repetir personas y sin incluir fechas de nacimiento desconocidas.`}
          />
          {enAmbos ? (
            <Cifra valor={personasTxt(enAmbos.valor)} rotulo="personas aparecen en más de un programa (dato informativo; no se resta)" regla="Cada persona identificada en dos o más programas cuenta una vez en este cruce." />
          ) : (
            <Cifra valor={String(presencia?.municipios ?? 0)} rotulo="municipios con actividad" regla="Se cuentan las claves oficiales de municipios con registros, no las distintas formas de escribir una ciudad." />
          )}
        </div>

        {sinId.valor > 0 && <p className="nota-rango">Hay {sinId.valor} registros sin identificar. Rango posible: {rango}; el extremo superior no es una cifra confirmada.</p>}
      </div>

      {/* Programa: cada tipo de registro por separado */}
      {!esGlobal && porPrograma[0] && porPrograma[0].resumen.length > 0 && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Registros por tipo</h2>
          <FilasTipos programaId={alcance} resumen={porPrograma[0].resumen} />
          <p className="etiqueta" style={{ marginTop: 'var(--sp-3)' }}>
            Son tipos de registro distintos: no se suman entre sí.
            {totalDonantes > 0 && (
              <> Donantes identificadas: {personasTxt(totalDonantes)}. Donar no cuenta como recibir atención.</>
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
          {totalDonantes > 0 && (
            <p className="etiqueta" style={{ marginTop: 'var(--sp-4)', borderTop: 'var(--border)', paddingTop: 'var(--sp-3)' }}>
              Donantes identificadas: {personasTxt(totalDonantes)}. Donar no cuenta como recibir atención.
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

      {presencia && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <PresenciaTerritorial resumen={presencia} />
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
