import { Suspense } from 'react';
import {
  coberturaPorCiudad, conteoUnidad, cruceProgramas, edadPromedio, fechaCorteActual,
  NOMBRE_UNIDAD, personasCerteza, personasPorCiudad, personasTxt, personasUnicas,
  sinIdentificar, unidadesConDatos, valoresDe, type Filtros,
} from '@/lib/datos';
import { FiltrosBarra } from '@/components/filtros';
import { BarList } from '@/components/ui/bar-list';
import { StatCard } from '@/components/ui/stat-card';
import { Alerta } from '@/components/ui/alert';
import { ComoSeCalculo } from '@/components/como';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { SearchX } from 'lucide-react';

export const dynamic = 'force-dynamic';

function uno(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
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
        <Empty className="border border-dashed border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
            <EmptyTitle>No hay datos con estos filtros</EmptyTitle>
            <EmptyDescription>
              Quita algún filtro o sube archivos en el paso 1. Todavía no hay nada importado que coincida.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Alerta variante="info">
            Cada tarjeta es una unidad distinta: una atención no es lo mismo que una participación o una
            entrega de insumo. Por eso <strong>no hay total general</strong> y las cifras no se suman entre sí.
          </Alerta>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {unidades.valor.map((u, i) => (
              <StatCard
                key={u}
                titulo={NOMBRE_UNIDAD[u]}
                valor={conteos[i].valor.toLocaleString('es-MX')}
                descripcion={`registros${f.programa ? ` en ${f.programa}` : ''}`}
                pie={<ComoSeCalculo med={conteos[i]} />}
              />
            ))}

            <StatCard
              titulo="Personas"
              valor={<>entre {personasTxt(personas.valor)} y {personasTxt(personas.valor + sinId.valor)}</>}
              descripcion={
                <>
                  {personasTxt(personas.valor)} identificadas
                  {sinId.valor > 0 ? ` + ${sinId.valor.toLocaleString('es-MX')} registros sin identificar` : ''}
                </>
              }
              pie={<ComoSeCalculo med={personas} />}
            >
              <ul className="mt-1 flex flex-col gap-1">
                <li className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                  <span>Con folio</span>
                  <strong className="mono">{personasTxt(conFolio.valor)}</strong>
                </li>
                <li className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                  <span>Con ID de EIRA</span>
                  <strong className="mono">{personasTxt(conId.valor)}</strong>
                </li>
              </ul>
            </StatCard>

            <StatCard
              titulo="Edad promedio"
              valor={edad.valor.promedio === null ? 'sin datos' : `${edad.valor.promedio.toLocaleString('es-MX')} años`}
              descripcion={`de ${personasTxt(edad.valor.n)} personas con fecha de nacimiento, al ${corte}`}
              pie={<ComoSeCalculo med={edad} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatCard
              titulo="Desglose por ciudad"
              descripcion="Personas únicas por ciudad (los valores menores a 5 se muestran como «<5»)."
              pie={<ComoSeCalculo med={porCiudad} />}
            >
              {porCiudad.valor.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay ciudades registradas todavía.</p>
              ) : (
                <BarList
                  datos={porCiudad.valor.map((c) => ({
                    nombre: c.ciudad,
                    valor: c.personas,
                    texto: personasTxt(c.personas),
                  }))}
                />
              )}
            </StatCard>

            <div className="flex flex-col gap-4">
              <StatCard titulo="Cruce entre programas" pie={<ComoSeCalculo med={cruce} />}>
                {cruce.valor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hace falta más de un programa cargado para mostrar cruces.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {cruce.valor.map((c) => (
                      <li key={c.par.join('+')} className="flex items-baseline justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                        <span>{c.par[0]} y {c.par[1]}</span>
                        <strong className="mono">{personasTxt(c.n)} personas en ambos</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </StatCard>

              <StatCard
                titulo="Cobertura por ciudad"
                descripcion="Personas alcanzadas frente a mujeres de 25 a 64 años del municipio."
                pie={<ComoSeCalculo med={cobertura} />}
              >
                {cobertura.valor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay datos de cobertura todavía.</p>
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
                        <tr key={c.ciudad} className="border-t border-border">
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
                <Alerta variante="aviso" className="mt-2">
                  Atenciones ficticias sobre población real (INEGI, Censo 2020).
                </Alerta>
              </StatCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
