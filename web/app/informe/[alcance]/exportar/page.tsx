import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe, tituloInforme } from '@/lib/informe';
import {
  edadPromedioIds, filtrosDe, rolesDe,
  personasEnMasDeUnPrograma, personasTxt, resumenTiposDe,
  sinIdentificar, type ResumenTipo,
} from '@/lib/datos';
import { nombrePrograma, pluralRol, pluralTipo, rolDe } from '@/lib/catalogo';
import { presenciaDe } from '@/lib/territorio';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { BotonImprimir } from '@/components/imprimir';
import { PresenciaTerritorial } from '@/components/presencia';

export const dynamic = 'force-dynamic';

export default async function PaginaExportar({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'exportar');
  const esGlobal = alcance === 'global';

  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);
  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join('; ') || 'sin archivos';

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
  const enAmbos = esGlobal ? (await personasEnMasDeUnPrograma(programaIds)).valor : 0;

  const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const notas: string[] = [
    `Personas identificadas de forma exacta, sin duplicados dentro de cada programa, en los archivos importados. Fuentes: ${nombresFuentes}. Fecha de corte: ${corte}.`,
    sinId.valor > 0
      ? `Hay además ${sinId.valor.toLocaleString('es-MX')} registros sin persona identificada: el total real está entre las dos cifras.`
      : 'Todos los registros quedaron con persona identificada.',
    `Edad calculada con las fechas de nacimiento registradas, a la fecha de corte ${corte}.`,
  ];
  if (esGlobal) {
    notas.push('El total global es la suma de las personas impactadas de cada programa: quien aparece en dos programas cuenta dos veces. Dentro de un mismo programa cada persona cuenta una sola vez.');
    if (totalDonantes > 0) notas.push('Donar no cuenta como recibir atención. Las donantes se reportan por separado.');
  }

  const filaTipo = (programaId: string, r: ResumenTipo) => (
    <li key={r.tipo} className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
      <span className="fila__cuerpo">
        {pluralTipo(r.tipo)}
        {r.personas !== null && (
          <span className="etiqueta"> — {personasTxt(r.personas)} {pluralRol(rolDe(programaId, r.tipo))}{!r.cuenta ? ' (no cuentan como impactadas)' : ''}</span>
        )}
      </span>
      <span className="fila__dato mono"><strong>{r.conteo.toLocaleString('es-MX')}</strong></span>
    </li>
  );

  return (
    <MarcoInforme
      estado={estado}
      paso="exportar"
      titulo="Exportar informe"
      bajada="Para descargar el PDF, elige «Guardar como PDF» en la ventana de impresión. El CSV contiene las cifras y sus fuentes."
    >
      <div className="no-imprimir mb-6 flex flex-wrap gap-3">
        <BotonImprimir />
        <a href={`/informe/${alcance}/informe.csv`} download className="btn btn--secundario">Descargar CSV</a>
      </div>

      <article className="tarjeta informe-imprimible">
        <header style={{ borderBottom: 'var(--border)', paddingBottom: 'var(--sp-4)' }}>
          <p className="solo-imprimir etiqueta">EIRA Movimiento Rosa A.C. · Datos ficticios de demostración</p>
          <h2 style={{ fontSize: 'var(--fs-h2)' }}>Informe de impacto · {tituloInforme(alcance)}</h2>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>Generado el {hoy} · datos al corte del {corte}</p>
          <p className="etiqueta">A partir de: {nombresFuentes}</p>
        </header>

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-personas">
          <h3 id="i-personas">Personas impactadas{esGlobal ? ' (suma de los programas)' : ''}</h3>
          <p className="cifra cifra--sm" style={{ marginTop: 'var(--sp-2)' }}>
            {personasTxt(totalImpactadas)}<sup aria-label="nota 1"> 1</sup>
          </p>
          {sinId.valor > 0 && <p>Rango posible: entre {personasTxt(totalImpactadas)} y {personasTxt(totalImpactadas + sinId.valor)}. El máximo incluye registros sin identificar; no es una cifra confirmada.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-3) 0 0' }}>
            <li className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
              <span className="fila__cuerpo">Edad promedio</span>
              <span className="fila__dato mono">
                <strong>{edad.valor.promedio === null ? 'sin datos' : `${edad.valor.promedio.toLocaleString('es-MX')} años`}</strong>
                <sup aria-label="nota 3"> 3</sup>
              </span>
            </li>
            {esGlobal && (
              <li className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                <span className="fila__cuerpo">Personas en más de un programa<sup aria-label="nota 4"> 4</sup></span>
                <span className="fila__dato mono"><strong>{personasTxt(enAmbos)}</strong></span>
              </li>
            )}
            {totalDonantes > 0 && (
              <li className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                <span className="fila__cuerpo">Donantes identificadas</span>
                <span className="fila__dato mono"><strong>{personasTxt(totalDonantes)}</strong></span>
              </li>
            )}
          </ul>
        </section>

        {porPrograma.map((p) => (
          <section key={p.id} style={{ marginTop: 'var(--sp-6)' }} aria-labelledby={`i-${p.id}`}>
            <h3 id={`i-${p.id}`}>{esGlobal ? p.nombre : 'Registros por tipo'}</h3>
            {esGlobal && (
              <p className="etiqueta">{personasTxt(p.ids.length)} personas impactadas</p>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
              {p.resumen.map((r) => filaTipo(p.id, r))}
            </ul>
            {p.resumen.length === 0 && <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>Sin registros.</p>}
          </section>
        ))}

        {presencia && (
          <section style={{ marginTop: 'var(--sp-6)' }}>
            <PresenciaTerritorial resumen={presencia} Titulo="h3" />
          </section>
        )}

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-advertencias">
          <h3 id="i-advertencias">Advertencias</h3>
          <ul style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-5, 20px)', color: 'var(--tinta-suave)', fontSize: 'var(--fs-small)' }}>
            <li>Datos ficticios de demostración.</li>
            <li>Toda cifra de personas menor a 5 se muestra como «&lt;5».</li>
            <li>Los tipos de registro no se suman entre sí.</li>
            <li>Los pares de personas aún sin decidir cuentan como una sola persona cada uno.</li>
          </ul>
        </section>

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-notas">
          <h3 id="i-notas">Notas al pie</h3>
          <ol style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-5, 20px)', color: 'var(--tinta-suave)', fontSize: 'var(--fs-small)' }}>
            {notas.map((n, i) => <li key={i} style={{ marginTop: 'var(--sp-1)' }}>{n}</li>)}
          </ol>
        </section>
      </article>

      <PieDePaso estado={estado} paso="exportar" />
    </MarcoInforme>
  );
}
