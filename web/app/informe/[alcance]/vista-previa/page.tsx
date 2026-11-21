import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe } from '@/lib/informe';
import {
  conteoUnidad, edadPromedio, filtrosDe, NOMBRE_UNIDAD, personasDePrograma,
  personasEntre, personasPorCiudad, personasTxt, personasUnicas, sinIdentificar,
  unidadesConDatos, type Med, type Unidad,
} from '@/lib/datos';
import { programasDemo } from '@/lib/catalogo';
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
      const j = JSON.parse(readFileSync(ruta, 'utf8')) as { impacto?: string };
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

export default async function PaginaVistaPrevia({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'vista-previa');
  const esGlobal = alcance === 'global';

  const f = await filtrosDe(alcance);
  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);
  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join(' · ');

  const [personas, sinId, porCiudad, unidades] = await Promise.all([
    personasUnicas(f), sinIdentificar(f), personasPorCiudad(f), unidadesConDatos(),
  ]);
  const edad = await edadPromedio(f, corte);
  const conteos = await Promise.all(unidades.valor.map((u) => conteoUnidad(u, f)));
  const unidadesConCifra = unidades.valor
    .map((u, i) => ({ u, med: conteos[i] }))
    .filter((x) => x.med.valor > 0);

  // Global: personas en ambos programas y cada programa con sus cifras.
  let enAmbos: Med<number> | null = null;
  let porPrograma: { id: string; nombre: string; personas: Med<number>; unidades: { u: Unidad; n: number }[] }[] = [];
  if (esGlobal) {
    const demos = programasDemo();
    enAmbos = await personasEntre(demos[0].id, demos[1].id);
    porPrograma = await Promise.all(
      demos.map(async (p) => {
        const fp = await filtrosDe(p.id);
        const [pers, uns] = await Promise.all([personasDePrograma(p.id), unidadesConDatos()]);
        const cs = await Promise.all(uns.valor.map((u) => conteoUnidad(u, fp)));
        return {
          id: p.id,
          nombre: p.nombre,
          personas: pers,
          unidades: uns.valor.map((u, i) => ({ u, n: cs[i].valor })).filter((x) => x.n > 0),
        };
      }),
    );
  }

  const maxPersonas = personas.valor + sinId.valor;
  const rango = sinId.valor > 0 ? `${personasTxt(personas.valor)} – ${personasTxt(maxPersonas)}` : personasTxt(personas.valor);
  const metabase = enlaceMetabase();

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
            rotulo={sinId.valor > 0 ? 'personas impactadas (rango: hay registros sin identificar)' : 'personas impactadas'}
            med={personas}
          />
          <Cifra
            valor={edad.valor.promedio === null ? '—' : `${edad.valor.promedio.toLocaleString('es-MX')}`}
            rotulo={edad.valor.promedio === null ? 'edad promedio (sin datos de nacimiento)' : `edad promedio, en años (${edad.valor.n} con fecha de nacimiento)`}
            med={edad}
          />
          {esGlobal && enAmbos ? (
            <Cifra valor={personasTxt(enAmbos.valor)} rotulo="de ellas están en los dos programas" med={enAmbos} />
          ) : (
            <Cifra valor={String(porCiudad.valor.filter((c) => c.personas > 0).length)} rotulo="ciudades con personas atendidas" />
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

      {/* Global: cada programa con sus cifras */}
      {esGlobal && porPrograma.length > 0 && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Cada programa por separado</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
            {porPrograma.map((p) => (
              <li key={p.id} className="fila">
                <span className="fila__cuerpo">
                  <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                  <span className="etiqueta" style={{ display: 'block' }}>
                    {p.unidades.map((x) => `${x.n.toLocaleString('es-MX')} ${NOMBRE_UNIDAD[x.u].toLowerCase()}`).join(' · ') || 'sin registros'}
                  </span>
                </span>
                <span className="fila__dato">
                  <strong className="mono" style={{ fontSize: 20 }}>{personasTxt(p.personas.valor)}</strong>
                  <span className="etiqueta" style={{ display: 'block' }}>personas</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unidades por separado: no se suman entre sí */}
      {unidadesConCifra.length > 0 && (
        <div className="tarjeta" style={{ marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Registros por tipo</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {unidadesConCifra.map(({ u, med }) => (
              <li key={u} className="fila">
                <span className="fila__cuerpo">{NOMBRE_UNIDAD[u]}</span>
                <span className="fila__dato"><strong className="mono" style={{ fontSize: 18 }}>{med.valor.toLocaleString('es-MX')}</strong></span>
              </li>
            ))}
          </ul>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-3)' }}>
            Son tipos de registro distintos: una misma persona puede tener una atención y una participación, así que no se suman entre sí.
          </p>
          {unidadesConCifra[0] && <ComoSeCalculo med={unidadesConCifra[0].med} />}
        </div>
      )}

      {metabase && (
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: 15, marginBottom: 'var(--sp-3)' }}>Para mirar más a fondo</h2>
          <iframe
            src={metabase}
            title="Tablero de impacto"
            style={{ width: '100%', height: 560, border: 'var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--white)' }}
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
