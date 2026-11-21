'use client';

// Tabla de pares posiblemente duplicados con selección múltiple y decisiones
// en masa. Cada decisión escribe al Stream eira:decisiones por la misma acción
// que la decisión individual (decidirPares → XADD tipo persona).
import { useState, useTransition } from 'react';
import type { Par } from '@/lib/comun';
import { decidirPares } from '@/lib/acciones';

export function ParesMasa({
  alcance,
  pares,
  nombreFuente,
}: {
  alcance: string;
  pares: Par[];
  nombreFuente: Record<string, string>;
}) {
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [decididos, setDecididos] = useState<Set<string>>(new Set());
  const [cargando, start] = useTransition();

  const pendientes = pares.filter((p) => !decididos.has(p.id));
  const alguno = elegidos.size > 0;

  function alterna(id: string, marcado: boolean) {
    setElegidos((s) => {
      const n = new Set(s);
      if (marcado) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function decidir(decision: 'misma' | 'distinta') {
    const ids = [...elegidos];
    if (ids.length === 0) return;
    start(async () => {
      await decidirPares(alcance, ids, decision);
      setDecididos((s) => new Set([...s, ...ids]));
      setElegidos(new Set());
    });
  }

  if (pendientes.length === 0) {
    return <p className="etiqueta" style={{ margin: 0 }}>No hay pares por decidir: los posibles duplicados ya están resueltos.</p>;
  }

  return (
    <div aria-busy={cargando}>
      {alguno && (
        <div
          role="toolbar"
          aria-label="Decisión sobre los seleccionados"
          className="estado estado--info"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-4)', marginBottom: 'var(--sp-3)' }}
        >
          <span>{elegidos.size} {elegidos.size === 1 ? 'par elegido' : 'pares elegidos'}</span>
          <button type="button" className="btn btn--primario btn--sm" disabled={cargando} onClick={() => decidir('misma')}>
            Son la misma persona
          </button>
          <button type="button" className="btn btn--secundario btn--sm" disabled={cargando} onClick={() => decidir('distinta')}>
            Son personas distintas
          </button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-small)' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2)', width: '2.5rem' }}>
              <input
                type="checkbox"
                aria-label="Elegir todos los pares"
                checked={pendientes.length > 0 && pendientes.every((p) => elegidos.has(p.id))}
                onChange={(e) => setElegidos(e.target.checked ? new Set(pendientes.map((p) => p.id)) : new Set())}
              />
            </th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2)' }}>Registro A</th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2)' }}>Registro B</th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2)' }}>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {pendientes.map((p) => (
            <tr key={p.id} style={{ borderTop: 'var(--border)', minHeight: 44 }}>
              <td style={{ padding: 'var(--sp-2)' }}>
                <input
                  type="checkbox"
                  aria-label={`Elegir par ${p.a.etiqueta} / ${p.b.etiqueta}`}
                  checked={elegidos.has(p.id)}
                  onChange={(e) => alterna(p.id, e.target.checked)}
                />
              </td>
              <td style={{ padding: 'var(--sp-2)' }}>
                {p.a.etiqueta}
                <span className="etiqueta" style={{ display: 'block' }}>{nombreFuente[p.a.fuente] ?? p.a.fuente}, fila {p.a.fila}</span>
              </td>
              <td style={{ padding: 'var(--sp-2)' }}>
                {p.b.etiqueta}
                <span className="etiqueta" style={{ display: 'block' }}>{nombreFuente[p.b.fuente] ?? p.b.fuente}, fila {p.b.fila}</span>
              </td>
              <td className="etiqueta" style={{ padding: 'var(--sp-2)' }}>{p.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
        Mientras no se decida, cada par cuenta como una sola persona.
      </p>
    </div>
  );
}
