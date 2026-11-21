import { anomaliasDe, listarFuentes, listarPares, omitidasDe, type Med, type Anomalia } from '@/lib/datos';
import { ComoSeCalculo } from '@/components/como';
import { Button } from '@/components/ui/button';
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
        <p className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 text-[var(--color-ink-2)]">
          Estás viendo la pantalla como Coordinación: puedes revisar los problemas, pero solo
          Presidencia puede tomar decisiones.
        </p>
      )}

      <section aria-labelledby="t-archivos" className="flex flex-col gap-4">
        <h2 id="t-archivos">Por archivo</h2>
        {detalles.length === 0 && (
          <div className="tarjeta">
            <p className="font-medium">Todavía no hay archivos importados.</p>
            <p className="text-[var(--color-muted)]">Cuando un archivo termine de procesarse, sus problemas aparecerán aquí agrupados por regla.</p>
          </div>
        )}
        {detalles.map(({ fuente: f, anomalias, omitidas }) => {
          const reglas = Object.entries(anomalias.valor);
          const sinProblemas = reglas.length === 0 && omitidas.valor.length === 0;
          return (
            <article key={f.id} className="tarjeta">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="max-w-none">{f.nombre}</h3>
                <span className="etiqueta">{f.programa} · corte {f.fecha_corte}</span>
              </div>

              {sinProblemas && <p className="mt-2">Sin problemas detectados: todas las filas entraron.</p>}

              {reglas.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                  {reglas.map(([regla, lista]: [string, Anomalia[]]) => (
                    <div key={regla}>
                      <p className="font-medium">
                        {REGLAS[regla] ?? regla} <span className="etiqueta">({lista.length})</span>
                      </p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {lista.map((a, i) => (
                          <li key={i} className="text-[var(--color-ink-2)]">
                            <span className="mono">fila {a.fila}</span>
                            {a.campo ? ` · ${a.campo}` : ''} — {a.detalle}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-2">
                        <span className="text-[var(--color-ink-2)]">
                          <span className="mono">fila {o.fila}</span> — ya estaba en «
                          {nombreFuente.get(o.ya_en_fuente) ?? o.ya_en_fuente}», fila {o.ya_en_fila}
                        </span>
                        {esPresidencia && (
                          <form action={restituirFila.bind(null, f.id, o.fila)}>
                            <Button variant="outline" type="submit">Contar de todos modos</Button>
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
          <div className="tarjeta">
            <p className="font-medium">No hay pares por decidir.</p>
            <p className="text-[var(--color-muted)]">Si aparecen dos registros con el mismo ID y datos distintos, se mostrarán aquí lado a lado.</p>
          </div>
        )}
        {paresPendientes.length === 0 && paresDecididos.length > 0 && (
          <p className="rounded-lg border border-[var(--color-rule)] bg-[var(--estado-listo-fondo)] px-4 py-3 text-[var(--estado-listo)]">
            Todos los pares ya fueron decididos ({paresDecididos.length}).
          </p>
        )}
        <div className="flex flex-col gap-4">
          {paresPendientes.map((p) => (
            <article key={p.id} className="tarjeta">
              <p className="etiqueta mb-2">{p.motivo}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[p.a, p.b].map((lado, i) => (
                  <div key={i} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
                    <p className="font-medium">{lado.etiqueta}</p>
                    <p className="etiqueta mt-1">
                      {nombreFuente.get(lado.fuente) ?? lado.fuente} · fila {lado.fila}
                    </p>
                  </div>
                ))}
              </div>
              {esPresidencia && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <form action={decidirPar.bind(null, p.id, 'misma')}>
                    <Button type="submit">Es la misma persona</Button>
                  </form>
                  <form action={decidirPar.bind(null, p.id, 'distinta')}>
                    <Button type="submit" variant="outline">Son dos personas</Button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
        <ComoSeCalculo med={pares} />
      </section>
    </div>
  );
}
