'use client';

// Tabla de pares posiblemente duplicados con selección múltiple y decisiones
// en masa. Cada decisión escribe al Stream eira:decisiones por la misma acción
// que la decisión individual (decidirPares → XADD tipo persona).
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Par } from '@/lib/comun';
import { decidirPares } from '@/lib/acciones';
import { opcionesPar, type IntencionPar } from '@/lib/decision-par';
import './pares.css';

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
  const [esperando, setEsperando] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();
  const [cargando, start] = useTransition();

  const pendientes = pares.filter((p) => p.estado === 'pendiente');
  const sinConfirmar = pendientes.some(p => esperando.includes(p.id));
  useEffect(() => {
    if (!sinConfirmar) return;
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [sinConfirmar, router]);
  const alguno = elegidos.size > 0;

  function alterna(id: string, marcado: boolean) {
    setElegidos((s) => {
      const n = new Set(s);
      if (marcado) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function decidir(decision: IntencionPar, ids = [...elegidos]) {
    if (ids.length === 0) return;
    start(async () => {
      try {
        const aplicado = await decidirPares(alcance, ids, decision);
        setEsperando(aplicado ? [] : ids);
        setMensaje(aplicado ? (decision === 'mismo_evento' ? 'Identidad confirmada. El motor aún no descuenta el evento duplicado.' : 'Decisión aplicada.') : '');
        setElegidos(new Set());
        router.refresh();
      } catch { setMensaje('No se confirmó el envío. Actualiza antes de intentarlo otra vez.'); }
    });
  }

  if (pendientes.length === 0) {
    return <p role="status">{mensaje} No quedan pares por decidir.</p>;
  }

  return (
    <div aria-busy={cargando}>
      <p role="status">{cargando ? 'Aplicando la decisión…' : sinConfirmar ? 'Decisión enviada. Esperando confirmación…' : mensaje}</p>
      <p className="par-aviso">El motor puede unir personas y conservar ambos eventos. Si marcas el mismo evento, guarda esa intención pero todavía no descuenta la fila.</p>
      <label className="par-elegir"><input type="checkbox" checked={pendientes.every(p => elegidos.has(p.id))}
        onChange={e => setElegidos(e.target.checked ? new Set(pendientes.map(p => p.id)) : new Set())} /> Elegir todos los pares</label>
      {alguno && (
        <div
          role="toolbar"
          aria-label="Decisión sobre los seleccionados"
          className="estado estado--info"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-4)', marginBottom: 'var(--sp-3)' }}
        >
          <span>{elegidos.size} {elegidos.size === 1 ? 'par elegido' : 'pares elegidos'}</span>
          {(Object.keys(opcionesPar) as IntencionPar[]).map(k => <button key={k} className="par-boton" disabled={cargando || sinConfirmar} onClick={() => decidir(k)}>{opcionesPar[k]}</button>)}
        </div>
      )}
      {pendientes.map((p, i) => (
        <article className="par-caso" key={p.id}>
          <label className="par-elegir"><input type="checkbox" checked={elegidos.has(p.id)} onChange={e => alterna(p.id, e.target.checked)} />Elegir par {i + 1}</label>
          <details open={i === 0}><summary>Comparar registros</summary>
            <p>{p.motivo}</p>
            <table className="par-tabla"><thead><tr><th scope="col">Campo</th><th scope="col">Registro A</th><th scope="col">Registro B</th></tr></thead><tbody>
              {([
                ['Referencia', p.a.etiqueta, p.b.etiqueta],
                ['Fecha del evento', p.a.fecha, p.b.fecha], ['Servicio', p.a.servicio, p.b.servicio],
                ['Programa', p.a.programa, p.b.programa],
                ['Archivo', nombreFuente[p.a.fuente] || p.a.fuente, nombreFuente[p.b.fuente] || p.b.fuente],
                ['Fila', p.a.fila, p.b.fila],
              ] as const).map(([campo,a,b]) => <tr key={campo} data-difiere={a !== b}><th scope="row">{campo}{a !== b && <small>Difiere</small>}</th><td>{a || 'No disponible'}</td><td>{b || 'No disponible'}</td></tr>)}
            </tbody></table>
            <p className="etiqueta">Si falta la fecha o el servicio, consulta las filas de origen antes de decidir.</p>
          </details>
          <div className="par-acciones" role="group" aria-label={`Decidir par ${i+1}`}>{(Object.keys(opcionesPar) as IntencionPar[]).map(k => <button key={k} className="par-boton" disabled={cargando || sinConfirmar} onClick={() => decidir(k,[p.id])}>{opcionesPar[k]}</button>)}</div>
        </article>
      ))}
      <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
        Mientras no se decida, cada par cuenta como una sola persona.
      </p>
    </div>
  );
}
