import { Suspense } from 'react';
import {
  coberturaPorCiudad, conteoUnidad, cruceProgramas, edadPromedio, fechaCorteActual,
  NOMBRE_UNIDAD, personasCerteza, personasPorCiudad, personasTxt, personasUnicas,
  sinIdentificar, unidadesConDatos, valoresDe, type Filtros, type Med,
} from '@/lib/datos';
import { FiltrosBarra } from '@/components/filtros';
import { BarrasCiudad } from '@/components/barras';
import { ComoSeCalculo } from '@/components/como';

export const dynamic = 'force-dynamic';

function uno(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

function Tarjeta({ titulo, children, med }: { titulo: string; children: React.ReactNode; med?: Med<unknown> }) {
  return (
    <article className="tarjeta flex flex-col gap-2">
      <h3>{titulo}</h3>
      {children}
      {med && <div className="mt-auto pt-1"><ComoSeCalculo med={med} /></div>}
    </article>
  );
}

export default async function PaginaTablero({ searchParams }: PageProps<'/tablero'>) {
  const sp = await searchParams;
  const f: Filtros = {
    programa: uno(sp.programa),
    periodo: uno(sp.periodo),
    ciudad: uno(sp.ciudad),
    servicio: uno(sp.servicio),
  };

  const [
    opcPrograma, opcCiudad, opcPeriodo, opcServicio,
    unidades, personas, conFolio, conId, sinId,
    corte, porCiudad, cruce, cobertura,
  ] = await Promise.all([
    valoresDe('programa'), valoresDe('ciudad'), valoresDe('periodo'), valoresDe('servicio'),
    unidadesConDatos(), personasUnicas(f), personasCerteza('folio', f), personasCerteza('id', f),
    sinIdentificar(f), fechaCorteActual(), personasPorCiudad(f), cruceProgramas(f), coberturaPorCiudad(f),
  ]);

  const edad = await edadPromedio(f, corte);
  const conteos = await Promise.all(unidades.valor.map((u) => conteoUnidad(u, f)));

  const hayDatos = unidades.valor.length > 0 || personas.valor > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="max-w-none">Vista previa del impacto</h1>
        <p className="lead mt-2">
          Cifras exactas calculadas en Valkey con los filtros elegidos. Fecha de corte:{' '}
          <strong>{corte}</strong>.
        </p>
      </div>

      <Suspense>
        <FiltrosBarra
          opciones={{ programa: opcPrograma.valor, ciudad: opcCiudad.valor, periodo: opcPeriodo.valor, servicio: opcServicio.valor }}
          activos={f}
        />
      </Suspense>

      {!hayDatos ? (
        <div className="tarjeta">
          <p className="font-medium">No hay datos con estos filtros.</p>
          <p className="text-[var(--color-muted)]">
            Quita algún filtro o sube archivos en el paso 1. Todavía no hay nada importado que coincida.
          </p>
        </div>
      ) : (
        <>
          <p className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 text-[var(--color-ink-2)]">
            Cada tarjeta es una unidad distinta: una atención no es lo mismo que una participación o una
            entrega de insumo. Por eso <strong>no hay total general</strong> y las cifras no se suman entre sí.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {unidades.valor.map((u, i) => (
              <Tarjeta key={u} titulo={NOMBRE_UNIDAD[u]} med={conteos[i]}>
                <p className="cifra">{conteos[i].valor.toLocaleString('es-MX')}</p>
                <p className="etiqueta">registros{f.programa ? ` en ${f.programa}` : ''}</p>
              </Tarjeta>
            ))}

            <Tarjeta titulo="Personas" med={personas}>
              <p className="cifra">
                entre {personasTxt(personas.valor)} y {personasTxt(personas.valor + sinId.valor)}
              </p>
              <p className="etiqueta">
                {personasTxt(personas.valor)} identificadas
                {sinId.valor > 0 ? ` + ${sinId.valor.toLocaleString('es-MX')} registros sin identificar` : ''}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                <li className="flex items-baseline justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
                  <span>Con folio</span>
                  <strong className="mono">{personasTxt(conFolio.valor)}</strong>
                </li>
                <li className="flex items-baseline justify-between gap-3 border-t border-[var(--color-rule)] pt-2">
                  <span>Con ID de EIRA</span>
                  <strong className="mono">{personasTxt(conId.valor)}</strong>
                </li>
              </ul>
            </Tarjeta>

            <Tarjeta titulo="Edad promedio" med={edad}>
              {edad.valor.promedio === null ? (
                <p className="cifra">sin datos</p>
              ) : (
                <p className="cifra">{edad.valor.promedio.toLocaleString('es-MX')} años</p>
              )}
              <p className="etiqueta">de {personasTxt(edad.valor.n)} personas con fecha de nacimiento, al {corte}</p>
            </Tarjeta>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Desglose por ciudad" med={porCiudad}>
              <p className="etiqueta">Personas únicas por ciudad (los valores menores a 5 se muestran como «&lt;5»).</p>
              {porCiudad.valor.length === 0 ? (
                <p>No hay ciudades registradas todavía.</p>
              ) : (
                <BarrasCiudad datos={porCiudad.valor} />
              )}
            </Tarjeta>

            <div className="flex flex-col gap-4">
              <Tarjeta titulo="Cruce entre programas" med={cruce}>
                {cruce.valor.length === 0 ? (
                  <p>Hace falta más de un programa cargado para mostrar cruces.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {cruce.valor.map((c) => (
                      <li key={c.par.join('+')} className="flex items-baseline justify-between gap-3 border-t border-[var(--color-rule)] pt-2 first:border-t-0 first:pt-0">
                        <span>{c.par[0]} y {c.par[1]}</span>
                        <strong className="mono">{personasTxt(c.n)} personas en ambos</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>

              <Tarjeta titulo="Cobertura por ciudad" med={cobertura}>
                <p className="etiqueta">
                  Personas alcanzadas frente a mujeres de 25 a 64 años del municipio.
                </p>
                {cobertura.valor.length === 0 ? (
                  <p>No hay datos de cobertura todavía.</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="etiqueta text-left">
                        <th className="py-1 pr-3 font-medium">Ciudad</th>
                        <th className="py-1 pr-3 text-right font-medium">Alcanzadas</th>
                        <th className="py-1 text-right font-medium">Cobertura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cobertura.valor.map((c) => (
                        <tr key={c.ciudad} className="border-t border-[var(--color-rule)]">
                          <td className="py-2 pr-3">{c.ciudad}</td>
                          <td className="py-2 pr-3 text-right mono">{personasTxt(c.personas)}</td>
                          <td className="py-2 text-right mono">
                            {c.denominador
                              ? `${((c.personas / c.denominador) * 100).toFixed(1)} % de ${c.denominador.toLocaleString('es-MX')}`
                              : 'sin denominador'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-2 rounded-md bg-[var(--estado-aviso-fondo)] px-3 py-2 text-[var(--estado-aviso)]">
                  Atenciones ficticias sobre población real (INEGI, Censo 2020).
                </p>
              </Tarjeta>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
