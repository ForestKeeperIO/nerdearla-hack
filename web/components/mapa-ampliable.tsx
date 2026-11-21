'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react';

type Vista = { k: number; x: number; y: number };
const INICIO: Vista = { k: 1, x: 0, y: 0 };
const limitar = (k: number) => Math.min(8, Math.max(1, k));

/** Muestra el mapa en su tarjeta y permite abrirlo grande, acercarlo y arrastrarlo. */
export function MapaAmpliable({ titulo, children }: { titulo: string; children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierto, abrir] = useState(false);
  const [v, mover] = useState<Vista>(INICIO);
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number; movido: boolean } | null>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (abierto && d && !d.open) d.showModal();
  }, [abierto]);

  const acercar = (factor: number) => mover(a => {
    const k = limitar(a.k * factor);
    return k === 1 ? INICIO : { ...a, k };
  });
  const cerrar = () => dialogo.current?.close();

  return <>
    {children}
    <button type="button" className="mapa-ampliar" onClick={() => { mover(INICIO); abrir(true); }}>
      <Maximize2 size={14} aria-hidden />Ampliar
    </button>
    {abierto && <dialog ref={dialogo} className="mapa-dialogo" aria-label={titulo} onClose={() => abrir(false)}
      onClick={e => { if (e.target === dialogo.current) cerrar(); }}>
      <header>
        <h2>{titulo}</h2>
        <div role="group" aria-label="Controles del mapa">
          <button type="button" onClick={() => acercar(1 / 1.4)} disabled={v.k <= 1} aria-label="Alejar" title="Alejar"><Minus size={16} aria-hidden /></button>
          <button type="button" onClick={() => acercar(1.4)} disabled={v.k >= 8} aria-label="Acercar" title="Acercar"><Plus size={16} aria-hidden /></button>
          <button type="button" onClick={() => mover(INICIO)} disabled={v.k === 1 && !v.x && !v.y}><RotateCcw size={14} aria-hidden />Restablecer</button>
          <button type="button" onClick={cerrar}><X size={15} aria-hidden />Cerrar</button>
        </div>
      </header>
      <div className="atlas-lienzo mapa-escena" data-arrastrando={arrastre.current ? '' : undefined}
        onWheel={e => acercar(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
        onPointerDown={e => { arrastre.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, movido: false }; }}
        onPointerMove={e => {
          const a = arrastre.current;
          if (!a || !(e.buttons & 1)) return;
          const dx = e.clientX - a.x, dy = e.clientY - a.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) a.movido = true;
          if (a.movido) mover(p => ({ ...p, x: a.vx + dx, y: a.vy + dy }));
        }}
        onPointerUp={() => { const a = arrastre.current; window.setTimeout(() => { if (arrastre.current === a) arrastre.current = null; }, 0); }}
        onClickCapture={e => { if (arrastre.current?.movido) { e.preventDefault(); e.stopPropagation(); } }}>
        <div className="mapa-capa" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})` }}>{children}</div>
      </div>
      <p>Arrastra para mover el mapa y usa la rueda o los botones para acercar. Un clic en un lugar con actividad filtra el Tablero.</p>
    </dialog>}
  </>;
}
