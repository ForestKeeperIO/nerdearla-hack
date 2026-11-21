import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe, tituloInforme } from '@/lib/informe';
import {
  conteoUnidad, edadPromedio, filtrosDe, NOMBRE_UNIDAD, personasDePrograma,
  personasEntre, personasPorCiudad, personasTxt, personasUnicas, sinIdentificar,
  unidadesConDatos,
} from '@/lib/datos';
import { programasDemo } from '@/lib/catalogo';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { BotonImprimir } from '@/components/imprimir';

export const dynamic = 'force-dynamic';

export default async function PaginaExportar({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'exportar');
  const esGlobal = alcance === 'global';

  const f = await filtrosDe(alcance);
  const corte = await fechaCorteDe(alcance);
  const fuentes = await fuentesDe(alcance);
  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join('; ') || 'sin archivos';

  const [personas, sinId, porCiudad, unidades] = await Promise.all([
    personasUnicas(f), sinIdentificar(f), personasPorCiudad(f), unidadesConDatos(),
  ]);
  const edad = await edadPromedio(f, corte);
  const conteos = await Promise.all(unidades.valor.map((u) => conteoUnidad(u, f)));
  const unidadesConCifra = unidades.valor.map((u, i) => ({ u, n: conteos[i].valor })).filter((x) => x.n > 0);

  let enAmbos = 0;
  let porPrograma: { nombre: string; personas: number }[] = [];
  if (esGlobal) {
    const demos = programasDemo();
    enAmbos = (await personasEntre(demos[0].id, demos[1].id)).valor;
    porPrograma = await Promise.all(
      demos.map(async (p) => ({ nombre: p.nombre, personas: (await personasDePrograma(p.id)).valor })),
    );
  }

  const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const notas: string[] = [
    `Personas identificadas de forma exacta, sin duplicados, en los archivos importados. Fuentes: ${nombresFuentes}. Fecha de corte: ${corte}.`,
    sinId.valor > 0
      ? `Hay además ${sinId.valor.toLocaleString('es-MX')} registros sin persona identificada: el total real está entre las dos cifras.`
      : 'Todos los registros quedaron con persona identificada.',
    `Edad calculada con las fechas de nacimiento registradas, a la fecha de corte ${corte}.`,
  ];
  if (esGlobal) notas.push('En el total global, cada persona cuenta una sola vez aunque aparezca en varios programas.');

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
          <h3 id="i-personas">Personas impactadas</h3>
          <p className="cifra cifra--sm" style={{ marginTop: 'var(--sp-2)' }}>
            {sinId.valor > 0
              ? <>entre {personasTxt(personas.valor)} y {personasTxt(personas.valor + sinId.valor)}<sup aria-label="notas 1 y 2"> 1, 2</sup></>
              : <>{personasTxt(personas.valor)}<sup aria-label="nota 1"> 1</sup></>}
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
                <span className="fila__cuerpo">De ellas, en los dos programas<sup aria-label="nota 4"> 4</sup></span>
                <span className="fila__dato mono"><strong>{personasTxt(enAmbos)}</strong></span>
              </li>
            )}
          </ul>
        </section>

        {esGlobal && porPrograma.length > 0 && (
          <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-programas">
            <h3 id="i-programas">Por programa</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
              {porPrograma.map((p) => (
                <li key={p.nombre} className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                  <span className="fila__cuerpo">{p.nombre}</span>
                  <span className="fila__dato mono"><strong>{personasTxt(p.personas)} personas</strong></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unidadesConCifra.length > 0 && (
          <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-unidades">
            <h3 id="i-unidades">Registros por tipo</h3>
            <p className="etiqueta">Tipos distintos: no se suman entre sí.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-2) 0 0' }}>
              {unidadesConCifra.map(({ u, n }) => (
                <li key={u} className="fila" style={{ paddingBlock: 'var(--sp-2)' }}>
                  <span className="fila__cuerpo">{NOMBRE_UNIDAD[u]}</span>
                  <span className="fila__dato mono"><strong>{n.toLocaleString('es-MX')}</strong></span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
          <ul style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-5, 20px)', color: 'var(--ink-soft)', fontSize: 'var(--fs-small)' }}>
            <li>Datos ficticios de demostración.</li>
            <li>Toda cifra de personas menor a 5 se muestra como «&lt;5».</li>
            <li>Los tipos de registro (atenciones, estudios, participaciones, entregas de insumo) no se suman entre sí.</li>
            <li>Los pares de personas aún sin decidir cuentan como una sola persona cada uno.</li>
          </ul>
        </section>

        <section style={{ marginTop: 'var(--sp-6)' }} aria-labelledby="i-notas">
          <h3 id="i-notas">Notas al pie</h3>
          <ol style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-5, 20px)', color: 'var(--ink-soft)', fontSize: 'var(--fs-small)' }}>
            {notas.map((n, i) => <li key={i} style={{ marginTop: 'var(--sp-1)' }}>{n}</li>)}
          </ol>
        </section>
      </article>

      <PieDePaso estado={estado} paso="exportar" />
    </MarcoInforme>
  );
}
