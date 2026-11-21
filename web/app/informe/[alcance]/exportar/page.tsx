import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe, tituloInforme } from '@/lib/informe';
import {
  edadPromedioIds, filtrosDe, impactadasIdsDe, noImpactadasIdsDe,
  personasEnMasDeUnPrograma, personasPorCiudadIds, personasTxt, resumenTiposDe,
  sinIdentificar, type ResumenTipo,
} from '@/lib/datos';
import { nombrePrograma, pluralRol, pluralTipo, programasDemo, rolDe } from '@/lib/catalogo';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { BotonImprimir } from '@/components/imprimir';

export const dynamic = 'force-dynamic';

export default async function PaginaExportar({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'exportar');
  const esGlobal = alcance === 'global';

  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);
  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join('; ') || 'sin archivos';

  const demos = programasDemo();
  const programaIds = esGlobal ? demos.map((d) => d.id) : [alcance];
  const porPrograma = await Promise.all(
    programaIds.map(async (id) => {
      const [ids, resumen, noImp] = await Promise.all([
        impactadasIdsDe(id),
        resumenTiposDe(id),
        noImpactadasIdsDe(id),
      ]);
      return { id, nombre: nombrePrograma(id), ids: ids.valor, resumen, noImpactadas: noImp.valor.length };
    }),
  );

  const totalImpactadas = porPrograma.reduce((s, p) => s + p.ids.length, 0);
  const idsUnicos = [...new Set(porPrograma.flatMap((p) => p.ids))];

  const f = await filtrosDe(alcance);
  const [sinId, edad, porCiudad] = await Promise.all([
    sinIdentificar(f),
    edadPromedioIds(idsUnicos, corte),
    personasPorCiudadIds(idsUnicos),
  ]);
  const enAmbos = esGlobal ? (await personasEnMasDeUnPrograma(programaIds)).valor : 0;
  const totalNoImpactadas = porPrograma.reduce((s, p) => s + p.noImpactadas, 0);

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
    if (totalNoImpactadas > 0) notas.push('Las personas que solo aportan (donantes y otros roles) se reportan aparte y no cuentan como impactadas.');
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
      bajada="El informe tal como se va a entregar, con notas al pie. Descarga el CSV o imprime para guardar en PDF."
    >
      <div className="no-imprimir mb-6 flex flex-wrap gap-3">
        <a href={`/informe/${alcance}/informe.csv`} download className="btn btn--secundario">Descargar CSV</a>
        <BotonImprimir />
      </div>

      <article className="tarjeta" style={{ maxWidth: '44rem' }}>
        <header style={{ borderBottom: 'var(--border)', paddingBottom: 'var(--sp-4)' }}>
          <p className="solo-imprimir etiqueta">EIRA Movimiento Rosa A.C. · Datos ficticios de demostración</p>
          <h2 style={{ fontSize: 'var(--fs-h2)' }}>Informe de impacto · {tituloInforme(alcance)}</h2>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>Generado el {hoy} · datos al corte del {corte}</p>
          <p className="etiqueta">A partir de: {nombresFuentes}</p>
        </header>

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-personas">
          <h3 id="i-personas">Personas impactadas{esGlobal ? ' (suma de los programas)' : ''}</h3>
          <p className="cifra cifra--sm" style={{ marginTop: 'var(--sp-2)' }}>
            {sinId.valor > 0
              ? <>entre {personasTxt(totalImpactadas)} y {personasTxt(totalImpactadas + sinId.valor)}<sup aria-label="notas 1 y 2"> 1, 2</sup></>
              : <>{personasTxt(totalImpactadas)}<sup aria-label="nota 1"> 1</sup></>}
          </p>
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
            {esGlobal && totalNoImpactadas > 0 && (
              <li className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                <span className="fila__cuerpo">Personas que solo aportan (no impactadas)<sup aria-label="nota 5"> 5</sup></span>
                <span className="fila__dato mono"><strong>{personasTxt(totalNoImpactadas)}</strong></span>
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

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-ciudades">
          <h3 id="i-ciudades">Desglose por ciudad</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
            {porCiudad.valor.filter((c) => c.personas > 0).map((c) => (
              <li key={c.ciudad} className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                <span className="fila__cuerpo">{c.ciudad}</span>
                <span className="fila__dato mono"><strong>{personasTxt(c.personas)}</strong></span>
              </li>
            ))}
          </ul>
        </section>

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
