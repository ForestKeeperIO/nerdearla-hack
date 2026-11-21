'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { ETIQUETA_DIM, type Opciones } from '@/lib/filtros-comun';
import { CAMPOS, consultaDe, filtrosActivos, periodoTexto, resumenCampo, VACIA, type Seleccion } from '@/lib/seleccion-tablero';
import { Selector } from './selector';

function Periodo({ f, corte, cambiar }: { f: Seleccion; corte: string; cambiar: (a: string, b: string) => void }) {
  const caja = useRef<HTMLDetailsElement>(null);
  const [a, desde] = useState(f.desde), [b, hasta] = useState(f.hasta);
  const fin = corte.slice(0,7);
  const inicio = new Date(`${fin}-01T12:00:00Z`);
  inicio.setUTCMonth(inicio.getUTCMonth()-2);
  function aplicar(x: string, y: string) {
    cambiar(x,y);
    if (caja.current) { caja.current.open = false; caja.current.querySelector('summary')?.focus(); }
  }
  useEffect(() => {
    const fuera = (e: PointerEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) caja.current.open = false; };
    document.addEventListener('pointerdown',fuera);
    return () => document.removeEventListener('pointerdown',fuera);
  }, []);
  return <details ref={caja} className="atlas-periodo" onToggle={e => {
    if (e.currentTarget.open) { desde(f.desde); hasta(f.hasta); }
  }} onKeyDown={e => {
    if (e.key === 'Escape' && caja.current?.open) { e.stopPropagation(); e.preventDefault(); caja.current.open = false; caja.current.querySelector('summary')?.focus(); }
  }}>
    <summary><span>Periodo</span><b>{periodoTexto(f)}</b><ChevronDown size={15} aria-hidden /></summary>
    <div className="atlas-periodo-panel">
      <div className="atlas-atajos">{[
        ['Último mes',fin,fin], ['Último trimestre',inicio.toISOString().slice(0,7),fin],
        ['Este año',`${fin.slice(0,4)}-01`,fin], ['Todo','',''],
      ].map(([texto,x,y]) => <button key={texto} type="button" onClick={() => aplicar(x,y)}>{texto}</button>)}</div>
      <form onSubmit={e => {e.preventDefault(); aplicar(a,b);}}>
        <label>Desde<input type="month" value={a} max={b || undefined} onChange={e => desde(e.target.value)} /></label>
        <label>Hasta<input type="month" value={b} min={a || undefined} onChange={e => hasta(e.target.value)} /></label>
        <button className="atlas-accion" type="submit"><CalendarDays size={15} aria-hidden />Aplicar periodo</button>
      </form>
    </div>
  </details>;
}

export function FiltrosAtlas({ seleccion, opciones, personas, corte }: { seleccion: Seleccion; opciones: Opciones; personas: number; corte: string }) {
  const router = useRouter(), hoja = useRef<HTMLDialogElement>(null);
  const [pendiente, start] = useTransition();
  const [f, marcar] = useOptimistic(seleccion);
  function navegar(next: Seleccion) {
    const q = consultaDe(next);
    start(() => { marcar(next); router.replace(q ? `/tablero?${q}` : '/tablero', { scroll: false }); });
  }
  function controles() {
    return <div className="atlas-campos">{CAMPOS.map(d =>
      <Selector key={d} label={ETIQUETA_DIM[d]} opciones={opciones[d]} elegidos={f[d]}
        resumenCerrado={resumenCampo(d,f,opciones)} cambiar={vs => navegar({ ...f, [d]: vs,
          ...(d === 'estado' && vs.length ? { municipio: f.municipio.filter(s => vs.includes(s.slice(0,2))) } : {}) })} />
    )}<Periodo f={f} corte={corte} cambiar={(desde,hasta) => navegar({...f,desde,hasta})} /></div>;
  }
  const activos = filtrosActivos(f);
  const resumen = [ `${personas.toLocaleString('es-MX')} ${personas===1?'persona':'personas'}`,
    f.programa.length ? resumenCampo('programa',f,opciones) : 'Todos los programas',
    ...(['estado','municipio'] as const).filter(d => f[d].length).map(d => resumenCampo(d,f,opciones)),
    ...(f.desde || f.hasta ? [periodoTexto(f)] : []) ].join(' · ');
  return <section aria-label="Filtros del tablero" className="atlas-filtros">
    <div className="atlas-escritorio">{controles()}</div>
    <button className="atlas-abrir" onClick={() => hoja.current?.showModal()}><SlidersHorizontal size={17} aria-hidden />Filtros ({activos})</button>
    <dialog className="atlas-hoja" ref={hoja} aria-label="Filtros">
      <header><h2>Filtros</h2><button autoFocus aria-label="Cerrar filtros" onClick={() => hoja.current?.close()}><X size={20}/></button></header>
      {controles()}<form method="dialog"><button className="atlas-accion">Ver resultados</button></form>
    </dialog>
    <div className="atlas-resumen"><p role="status">{pendiente ? 'Actualizando selección…' : `Mostrando ${resumen}`}</p>
      {activos > 0 && <button onClick={() => navegar(VACIA)}>Limpiar</button>}</div>
  </section>;
}
