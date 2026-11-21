'use client';

// "¿Es la misma persona?": un caso a la vez, dos registros lado a lado, dos botones.
import { useTransition } from 'react';
import type { Par } from '@/lib/comun';
import { decidirPar } from '@/lib/acciones';

/** Fila de la comparación: el valor de cada registro, resaltado si difieren. */
function FilaCampo({ campo, a, b }: { campo: string; a: string; b: string }) {
  const difiere = a !== b;
  const celda = { padding: 'var(--sp-2) var(--sp-3)', borderTop: 'var(--border)', verticalAlign: 'top' as const };
  const resaltado = difiere ? { background: 'var(--rubor)' } : {};
  return (
    <tr>
      <th scope="row" className="etiqueta" style={{ ...celda, textAlign: 'left', fontWeight: 500, width: '7rem' }}>{campo}</th>
      <td style={{ ...celda, ...resaltado }}>{a}</td>
      <td style={{ ...celda, ...resaltado }}>{b}</td>
    </tr>
  );
}

export function MismaPersona({
  alcance,
  pares,
  nombreFuente,
  decididos,
  alDecidir,
}: {
  alcance: string;
  pares: Par[];
  nombreFuente: Record<string, string>;
  decididos: Set<string>;
  alDecidir: (id: string) => void;
}) {
  const [cargando, start] = useTransition();

  const pendientes = pares.filter((p) => !decididos.has(p.id));
  const actual = pendientes[0];

  function decidir(decision: 'misma' | 'distinta') {
    if (!actual) return;
    const id = actual.id;
    start(async () => {
      await decidirPar(alcance, id, decision);
      alDecidir(id);
    });
  }

  if (!actual) {
    return (
      <p style={{ borderTop: 'var(--border)', paddingTop: 'var(--sp-4)' }}>
        No quedan casos por decidir.
      </p>
    );
  }

  return (
    <div aria-busy={cargando}>
      <div className="flex items-baseline justify-between gap-3">
        <p style={{ fontWeight: 500 }}>¿Es la misma persona?</p>
        <p className="etiqueta">Faltan {pendientes.length} por decidir</p>
      </div>
      {actual.motivo && <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>{actual.motivo}</p>}
      <table className="mt-4" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-small)', border: 'var(--border)', borderRadius: 'var(--r-sm)' }}>
        <thead>
          <tr>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', width: '7rem' }}></th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', fontWeight: 500 }}>Registro A</th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', fontWeight: 500 }}>Registro B</th>
          </tr>
        </thead>
        <tbody>
          <FilaCampo campo="Identificación" a={actual.a.etiqueta} b={actual.b.etiqueta} />
          <FilaCampo campo="Archivo" a={nombreFuente[actual.a.fuente] ?? actual.a.fuente} b={nombreFuente[actual.b.fuente] ?? actual.b.fuente} />
          <FilaCampo campo="Fila" a={String(actual.a.fila)} b={String(actual.b.fila)} />
        </tbody>
      </table>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
        Las celdas sombreadas son las que difieren entre los dos registros.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn--primario" disabled={cargando} onClick={() => decidir('misma')}>
          Es la misma persona
        </button>
        <button type="button" className="btn btn--secundario" disabled={cargando} onClick={() => decidir('distinta')}>
          Son dos personas
        </button>
      </div>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-3)' }}>
        Mientras no se decida, cada par cuenta como una sola persona en las cifras.
      </p>
    </div>
  );
}
