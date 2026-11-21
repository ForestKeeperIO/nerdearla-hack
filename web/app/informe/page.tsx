import {
  conteoUnidad, edadPromedio, fechaCorteActual, leerBitacora, listarFuentes,
  NOMBRE_UNIDAD, personasCerteza, personasPorCiudad, personasTxt, personasUnicas,
  sinIdentificar, unidadesConDatos,
} from '@/lib/datos';
import { BotonImprimir } from '@/components/imprimir';

export const dynamic = 'force-dynamic';

export default async function PaginaInforme() {
  const f = {};
  const [fuentes, unidades, personas, conFolio, conId, sinId, corte, porCiudad, bitacora] =
    await Promise.all([
      listarFuentes(), unidadesConDatos(), personasUnicas(f), personasCerteza('folio', f),
      personasCerteza('id', f), sinIdentificar(f), fechaCorteActual(), personasPorCiudad(f),
      leerBitacora(50),
    ]);
  const edad = await edadPromedio(f, corte);
  const conteos = await Promise.all(unidades.valor.map((u) => conteoUnidad(u, f)));

  const nombresFuentes = fuentes.valor.map((x) => x.nombre).join('; ');
  const maxPersonas = personas.valor + sinId.valor;

  const notas: string[] = [
    `Personas identificadas de forma exacta (sin duplicados) en los archivos importados. Definición: identificadores únicos en eira:per:*. Fuentes: ${nombresFuentes || 'sin archivos'}. Fecha de corte: ${corte}.`,
    `Incluye además ${sinId.valor.toLocaleString('es-MX')} registros sin persona identificada: el total real está entre las dos cifras.`,
    `Edad calculada con las fechas de nacimiento registradas, a la fecha de corte ${corte}.`,
    `Atenciones ficticias sobre población real (INEGI, Censo 2020).`,
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="max-w-none">Exportar informe</h1>
          <p className="lead mt-2">
            Vista imprimible con cada cifra y su nota al pie: qué cuenta, de qué archivo salió y a qué fecha.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/informe.csv"
            download="informe-eira.csv"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-input)] bg-[var(--color-cotton)] px-4 font-medium no-underline hover:bg-[var(--color-paper-2)]"
          >
            Descargar CSV
          </a>
          <BotonImprimir />
        </div>
      </div>

      <article className="tarjeta max-w-3xl">
        <header className="border-b border-[var(--color-rule)] pb-4">
          <p className="solo-imprimir etiqueta">EIRA Movimiento Rosa A.C. · Datos ficticios de demostración</p>
          <h2 className="max-w-none">Informe de impacto</h2>
          <p className="etiqueta mt-1">
            Generado el {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="etiqueta">
            Datos al corte del {corte}, a partir de: {nombresFuentes || 'ninguna fuente todavía'}
          </p>
        </header>

        <section className="mt-4" aria-labelledby="i-personas">
          <h3 id="i-personas">Personas impactadas</h3>
          <p className="cifra mt-1">
            entre {personasTxt(personas.valor)} y {personasTxt(maxPersonas)}
            <sup aria-label="notas 1 y 2"> 1, 2</sup>
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            <li className="flex justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
              <span>Con folio</span><strong className="mono">{personasTxt(conFolio.valor)}</strong>
            </li>
            <li className="flex justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
              <span>Con ID de EIRA</span><strong className="mono">{personasTxt(conId.valor)}</strong>
            </li>
            <li className="flex justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
              <span>Edad promedio</span>
              <strong className="mono">
                {edad.valor.promedio === null ? 'sin datos' : `${edad.valor.promedio.toLocaleString('es-MX')} años`}
                <sup aria-label="nota 3"> 3</sup>
              </strong>
            </li>
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="i-unidades">
          <h3 id="i-unidades">Registros por unidad</h3>
          <p className="etiqueta">Unidades distintas: no se suman entre sí.</p>
          <ul className="mt-2 flex flex-col gap-1">
            {unidades.valor.map((u, i) => (
              <li key={u} className="flex justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
                <span>{NOMBRE_UNIDAD[u]}</span>
                <strong className="mono">{conteos[i].valor.toLocaleString('es-MX')}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="i-ciudades">
          <h3 id="i-ciudades">Desglose por ciudad<sup aria-label="nota 4"> 4</sup></h3>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr className="etiqueta text-left">
                <th className="py-1 pr-3 font-medium">Ciudad</th>
                <th className="py-1 text-right font-medium">Personas únicas</th>
              </tr>
            </thead>
            <tbody>
              {porCiudad.valor.map((c) => (
                <tr key={c.ciudad} className="border-t border-[var(--color-rule)]">
                  <td className="py-2 pr-3">{c.ciudad}</td>
                  <td className="py-2 text-right mono">{personasTxt(c.personas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6" aria-labelledby="i-advertencias">
          <h3 id="i-advertencias">Advertencias</h3>
          <ul className="mt-2 list-disc pl-5 text-[var(--color-ink-2)]">
            <li>Datos ficticios de demostración.</li>
            <li>Atenciones ficticias sobre población real (INEGI, Censo 2020).</li>
            <li>Toda cifra de personas menor a 5 se muestra como «&lt;5».</li>
            <li>Las unidades (atenciones, estudios, participaciones, entregas de insumo) no se suman entre sí.</li>
            <li>Los pares de personas aún sin decidir cuentan como una sola persona cada uno.</li>
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="i-notas">
          <h3 id="i-notas">Notas al pie</h3>
          <ol className="mt-2 list-decimal pl-5 text-[var(--color-ink-2)]">
            {notas.map((n, i) => (
              <li key={i} className="mt-1">{n}</li>
            ))}
          </ol>
        </section>
      </article>

      <article className="tarjeta max-w-3xl">
        <h3 className="max-w-none">Bitácora</h3>
        <p className="etiqueta">Cada carga, omisión, decisión e informe, en orden.</p>
        {bitacora.valor.length === 0 ? (
          <p className="mt-2">La bitácora está vacía todavía.</p>
        ) : (
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr className="etiqueta text-left">
                <th className="py-1 pr-3 font-medium">Cuándo</th>
                <th className="py-1 pr-3 font-medium">Quién</th>
                <th className="py-1 pr-3 font-medium">Tipo</th>
                <th className="py-1 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {bitacora.valor.map((b) => (
                <tr key={b.id} className="border-t border-[var(--color-rule)] align-top">
                  <td className="py-2 pr-3 mono whitespace-nowrap">{b.en.slice(0, 16).replace('T', ' ')}</td>
                  <td className="py-2 pr-3">{b.por}</td>
                  <td className="py-2 pr-3">{b.tipo}</td>
                  <td className="py-2">{b.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}
