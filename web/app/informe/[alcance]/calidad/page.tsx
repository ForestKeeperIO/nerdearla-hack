import { exigirPaso } from '@/lib/guardia';
import { fuentesDe, paresDe } from '@/lib/informe';
import {
  anomaliasDe, cruceProgramas, filasCompartidas, omitidasDe, personasTxt,
  type Anomalia, type Med,
} from '@/lib/datos';
import { resolverCalidad, restituirFila } from '@/lib/acciones';
import { MarcoInforme } from '@/components/marco';
import { CalidadCliente } from '@/components/calidad-cliente';
import { ComoSeCalculo } from '@/components/como';
import { StarRating } from '@/components/ui/star-rating';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { listarFuentes } from '@/lib/datos';
import type { Par } from '@/lib/comun';

export const dynamic = 'force-dynamic';

const REGLAS: Record<string, string> = {
  faltante: 'Dato faltante',
  fecha_invalida: 'Fecha no reconocida',
  fecha_futura: 'Fecha posterior al corte',
  ciudad_desconocida: 'Ciudad no reconocida',
  id_invalido: 'ID no válido',
  edad_inconsistente: 'La edad no coincide con la fecha de nacimiento',
  fila_repetida: 'Fila repetida dentro del archivo',
  fila_ya_cargada: 'Fila ya cargada en otro archivo',
  posible_correccion: 'Posible corrección de otra fila',
  discrepancia_total: 'El total del archivo no cuadra',
};

function GrupoProblemas({ anomalias }: { anomalias: Record<string, Anomalia[]> }) {
  const grupos = Object.entries(anomalias).filter(([, l]) => l.length > 0);
  if (grupos.length === 0) return null;
  return (
    <Accordion defaultValue={grupos.filter(([, l]) => l.length <= 6).map(([r]) => r)} className="mt-4">
      {grupos.map(([regla, lista]) => (
        <AccordionItem key={regla} value={regla}>
          <AccordionTrigger style={{ fontWeight: 500, fontSize: 'var(--fs-small)' }}>
            {REGLAS[regla] ?? regla} · {lista.length} {lista.length === 1 ? 'fila' : 'filas'}
          </AccordionTrigger>
          <AccordionContent>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {lista.map((an, i) => (
                <li key={i} style={{ borderTop: 'var(--border)', padding: 'var(--sp-2) 0', display: 'flex', gap: 'var(--sp-4)', fontSize: 'var(--fs-small)' }}>
                  <span className="mono" style={{ color: 'var(--tinta-tenue)', flexShrink: 0 }}>fila {an.fila}</span>
                  <span style={{ color: 'var(--tinta-suave)' }}>{an.campo ? `${an.campo}: ` : ''}{an.detalle}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default async function PaginaCalidad({ params }: { params: Promise<{ alcance: string }> }) {
  const { alcance: a } = await params;
  const { alcance, estado } = await exigirPaso(a, 'calidad');
  const esGlobal = alcance === 'global';

  const [fuentes, pares, todas] = await Promise.all([fuentesDe(alcance), paresDe(alcance), listarFuentes()]);
  const nombreFuente = Object.fromEntries(todas.valor.map((f) => [f.id, f.nombre]));
  const paresPendientes: Par[] = pares.valor.filter((p) => p.estado === 'pendiente');

  const detalles = await Promise.all(
    fuentes.valor.map(async (f) => ({
      fuente: f,
      anomalias: await anomaliasDe(f.id),
      omitidas: await omitidasDe(f.id),
    })),
  );

  // Lo que solo se ve al juntar programas (Global).
  let cruces: Med<{ par: [string, string]; n: number }[]> | null = null;
  let compartidas: Med<number> | null = null;
  if (esGlobal) {
    [cruces, compartidas] = await Promise.all([cruceProgramas({}), filasCompartidas()]);
    cruces = { ...cruces, valor: cruces.valor.filter((c) => c.n > 0) };
  }

  return (
    <MarcoInforme
      estado={estado}
      paso="calidad"
      titulo="Calidad de los datos"
      bajada={
        esGlobal
          ? 'Lo que solo se ve al juntar los programas: personas que aparecen en más de uno y filas que dos coordinaciones registraron igual.'
          : 'La calificación de cada archivo, lo que le falta y los casos que solo una persona puede decidir.'
      }
    >
      {esGlobal && cruces && compartidas && (
        <div className="tarjeta" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="flex flex-wrap gap-10">
            {cruces.valor.map((c) => (
              <div key={c.par.join('·')}>
                <p className="cifra cifra--sm">{personasTxt(c.n)}</p>
                <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>personas en {c.par[0]} y {c.par[1]}</p>
              </div>
            ))}
            <div>
              <p className="cifra cifra--sm">{compartidas.valor.toLocaleString('es-MX')}</p>
              <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>filas registradas igual por dos coordinaciones (se cuentan una vez)</p>
            </div>
          </div>
          <ComoSeCalculo med={cruces} />
        </div>
      )}

      {!esGlobal && (
        <section aria-label="Por archivo">
          {detalles.map(({ fuente: f, anomalias, omitidas }) => {
            const planas = Object.values(anomalias.valor).flat();
            return (
              <Card key={f.id} className="mb-4" style={{ borderRadius: 'var(--r-lg)', border: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 style={{ fontSize: 16 }}>{f.nombre}</h2>
                    <p className="etiqueta" style={{ marginTop: 2 }}>{f.filas_nuevas} filas contadas · corte {f.fecha_corte}</p>
                  </div>
                  <StarRating valor={f.estrellas} etiqueta={`${f.estrellas} / 5`} />
                </CardHeader>
                <CardContent>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--tinta-suave)' }}>
                  {f.motivos.length > 0 ? `Qué le falta: ${f.motivos.join('; ')}.` : 'No le falta nada: está completa.'}
                </p>
                <GrupoProblemas anomalias={anomalias.valor} />
                {omitidas.valor.length > 0 && (
                  <details className="calculo" style={{ marginTop: 'var(--sp-2)' }}>
                    <summary style={{ color: 'var(--tinta)', fontWeight: 500 }}>
                      {omitidas.valor.length} {omitidas.valor.length === 1 ? 'fila no se contó' : 'filas no se contaron'} por ya estar en otro archivo
                    </summary>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-1) 0 var(--sp-3)' }}>
                      {omitidas.valor.map((o, i) => (
                        <li key={i} style={{ borderTop: 'var(--border)', padding: 'var(--sp-2) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', fontSize: 'var(--fs-small)' }}>
                          <span style={{ color: 'var(--tinta-suave)' }}>
                            <span className="mono" style={{ color: 'var(--tinta-tenue)' }}>fila {o.fila}</span> — ya estaba en «{nombreFuente[o.ya_en_fuente] ?? o.ya_en_fuente}», fila {o.ya_en_fila}
                          </span>
                          <form action={restituirFila.bind(null, alcance, f.id, o.fila)}>
                            <button type="submit" className="btn btn--secundario btn--sm">Contar de todos modos</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {planas.length === 0 && omitidas.valor.length === 0 && (
                  <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>Sin problemas detectados: todas las filas entraron.</p>
                )}
                <ComoSeCalculo med={anomalias} />
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <CalidadCliente
        alcance={alcance}
        pares={paresPendientes}
        nombreFuente={nombreFuente}
        estado={estado}
        accion={resolverCalidad.bind(null, alcance)}
      />
    </MarcoInforme>
  );
}
