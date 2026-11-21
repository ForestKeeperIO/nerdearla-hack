import { anomaliasDe, listarFuentes, listarPares, omitidasDe, type Anomalia } from '@/lib/datos';
import { ComoSeCalculo } from '@/components/como';
import { Button } from '@/components/ui/button';
import { Alerta } from '@/components/ui/alert';
import { Comparison } from '@/components/ui/comparison';
import { StarRating } from '@/components/ui/star-rating';
import { TablaAnomalias } from '@/components/tabla-anomalias';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ClipboardCheck, Users } from 'lucide-react';
import { decidirPar, restituirFila } from '@/lib/acciones';
import { rolActual } from '@/lib/rol';

export const dynamic = 'force-dynamic';

const REGLAS: Record<string, string> = {
  faltante: 'Dato faltante',
  fecha_invalida: 'Fecha no reconocida',
  fecha_futura: 'Fecha posterior al corte',
  ciudad_desconocida: 'Ciudad no reconocida',
  id_invalido: 'ID o folio no válido',
  edad_inconsistente: 'La edad no coincide con la fecha de nacimiento',
  fila_repetida: 'Fila repetida dentro del archivo',
  fila_ya_cargada: 'Fila ya cargada en otro archivo',
  posible_correccion: 'Posible corrección de otra fila',
  discrepancia_total: 'El total del archivo no cuadra',
};

export default async function PaginaCalidad() {
  const [rol, fuentes, pares] = await Promise.all([rolActual(), listarFuentes(), listarPares()]);
  const esPresidencia = rol === 'presidencia';

  const detalles = await Promise.all(
    fuentes.valor.map(async (f) => ({
      fuente: f,
      anomalias: await anomaliasDe(f.id),
      omitidas: await omitidasDe(f.id),
    })),
  );

  const nombreFuente = new Map(fuentes.valor.map((f) => [f.id, f.nombre]));
  const paresPendientes = pares.valor.filter((p) => p.estado === 'pendiente');
  const paresDecididos = pares.valor.filter((p) => p.estado !== 'pendiente');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="max-w-none">Calidad de los datos</h1>
        <p className="lead mt-2">
          Lo que el procesamiento encontró en cada archivo y lo que falta por decidir. Las decisiones
          las toma Presidencia y quedan en la bitácora.
        </p>
      </div>

      {!esPresidencia && (
        <Alerta variante="info" titulo="Vista de Coordinación">
          Puedes revisar los problemas, pero solo Presidencia puede tomar decisiones.
        </Alerta>
      )}

      {paresPendientes.length > 0 && (
        <Alerta variante="aviso" titulo={`${paresPendientes.length} ${paresPendientes.length === 1 ? 'par' : 'pares'} de personas por decidir`}>
          Mientras no se decidan, cada par cuenta como una sola persona en las cifras.
        </Alerta>
      )}

      <section aria-labelledby="t-archivos" className="flex flex-col gap-4">
        <h2 id="t-archivos">Por archivo</h2>
        {detalles.length === 0 && (
          <Empty className="border border-dashed border-border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ClipboardCheck /></EmptyMedia>
              <EmptyTitle>Todavía no hay archivos importados</EmptyTitle>
              <EmptyDescription>
                Cuando un archivo termine de procesarse, sus problemas aparecerán aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {detalles.map(({ fuente: f, anomalias, omitidas }) => {
          const planas: Anomalia[] = Object.values(anomalias.valor).flat();
          const sinProblemas = planas.length === 0 && omitidas.valor.length === 0;
          return (
            <article key={f.id} className="tarjeta">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="max-w-none">{f.nombre}</h3>
                  <p className="etiqueta mt-0.5">{f.programa}, corte {f.fecha_corte}</p>
                </div>
                <div className="flex items-center gap-3">
                  {f.puntaje > 0 && (
                    <span className="etiqueta tabular-nums">calidad {f.puntaje}/100</span>
                  )}
                  <StarRating valor={f.estrellas} etiqueta={`${f.estrellas} / 5`} />
                </div>
              </div>

              {sinProblemas && <p className="mt-3">Sin problemas detectados: todas las filas entraron.</p>}

              {planas.length > 0 && (
                <div className="mt-4">
                  <TablaAnomalias anomalias={planas} reglas={REGLAS} />
                </div>
              )}

              {omitidas.valor.length > 0 && (
                <details className="calculo mt-4">
                  <summary>
                    <span className="font-medium text-[var(--color-ink)]">
                      Filas omitidas por ya estar cargadas ({omitidas.valor.length})
                    </span>
                  </summary>
                  <ul className="mt-1 flex flex-col gap-2">
                    {omitidas.valor.map((o, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                        <span className="text-[var(--color-ink-2)]">
                          <span className="mono">fila {o.fila}</span>: ya estaba en «
                          {nombreFuente.get(o.ya_en_fuente) ?? o.ya_en_fuente}», fila {o.ya_en_fila}
                        </span>
                        {esPresidencia && (
                          <form action={restituirFila.bind(null, f.id, o.fila)}>
                            <Button variant="outline" size="sm" type="submit">Contar de todos modos</Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                  <ComoSeCalculo med={omitidas} />
                </details>
              )}
              <ComoSeCalculo med={anomalias} />
            </article>
          );
        })}
      </section>

      <section aria-labelledby="t-pares" className="flex flex-col gap-4">
        <h2 id="t-pares">¿Es la misma persona?</h2>
        <p className="text-[var(--color-muted)]">
          El procesamiento junta a quienes comparten ID de EIRA. Cuando el mismo ID aparece con datos
          distintos, lo decide una persona. Hasta que alguien decida, cada par cuenta como una sola persona.
        </p>
        {paresPendientes.length === 0 && paresDecididos.length === 0 && (
          <Empty className="border border-dashed border-border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>No hay pares por decidir</EmptyTitle>
              <EmptyDescription>
                Si aparecen dos registros con el mismo ID y datos distintos, se mostrarán aquí lado a lado.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {paresPendientes.length === 0 && paresDecididos.length > 0 && (
          <Alerta variante="listo" titulo={`Todos los pares ya fueron decididos (${paresDecididos.length}).`} />
        )}
        <div className="flex flex-col gap-4">
          {paresPendientes.map((p) => (
            <Comparison
              key={p.id}
              motivo={p.motivo}
              a={{
                titulo: p.a.etiqueta,
                subtitulo: `${nombreFuente.get(p.a.fuente) ?? p.a.fuente}, fila ${p.a.fila}`,
              }}
              b={{
                titulo: p.b.etiqueta,
                subtitulo: `${nombreFuente.get(p.b.fuente) ?? p.b.fuente}, fila ${p.b.fila}`,
              }}
              acciones={
                esPresidencia ? (
                  <>
                    <form action={decidirPar.bind(null, p.id, 'misma')}>
                      <Button type="submit">Es la misma persona</Button>
                    </form>
                    <form action={decidirPar.bind(null, p.id, 'distinta')}>
                      <Button type="submit" variant="outline">Son dos personas</Button>
                    </form>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
        <ComoSeCalculo med={pares} />
      </section>
    </div>
  );
}
