'use client';

// "¿Es la misma persona?": un caso a la vez, dos registros lado a lado, dos botones.
import { useState, useTransition } from 'react';
import type { Par } from '@/lib/comun';
import { decidirPar } from '@/lib/acciones';

function Lado({ titulo, etiqueta, fuente, fila }: { titulo: string; etiqueta: string; fuente: string; fila: number }) {
  return (
    <div className="tarjeta" style={{ padding: 'var(--sp-4)', flex: 1, minWidth: 0 }}>
      <p className="etiqueta mono" style={{ fontSize: 'var(--fs-meta)', letterSpacing: '0.04em' }}>{titulo}</p>
      <p style={{ fontWeight: 500, marginTop: 'var(--sp-2)' }}>{etiqueta}</p>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>{fuente} · fila {fila}</p>
    </div>
  );
}

export function MismaPersona({
  alcance,
  pares,
  nombreFuente,
}: {
  alcance: string;
  pares: Par[];
  nombreFuente: Record<string, string>;
}) {
  const [decididos, setDecididos] = useState<Set<string>>(new Set());
  const [cargando, start] = useTransition();

  const pendientes = pares.filter((p) => !decididos.has(p.id));
  const actual = pendientes[0];

  function decidir(decision: 'misma' | 'distinta') {
    if (!actual) return;
    const id = actual.id;
    start(async () => {
      await decidirPar(alcance, id, decision);
      setDecididos((s) => new Set(s).add(id));
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
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <Lado
          titulo="Registro A"
          etiqueta={actual.a.etiqueta}
          fuente={nombreFuente[actual.a.fuente] ?? actual.a.fuente}
          fila={actual.a.fila}
        />
        <div className="flex items-center justify-center" aria-hidden="true">
          <span
            className="mono"
            style={{
              fontSize: 'var(--fs-meta)', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--tinta-tenue)', border: 'var(--border)', borderRadius: 'var(--r-sm)',
              padding: 'var(--sp-1) var(--sp-3)', background: 'var(--superficie)',
            }}
          >
            vs
          </span>
        </div>
        <Lado
          titulo="Registro B"
          etiqueta={actual.b.etiqueta}
          fuente={nombreFuente[actual.b.fuente] ?? actual.b.fuente}
          fila={actual.b.fila}
        />
      </div>
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
