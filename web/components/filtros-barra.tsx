'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, SlidersHorizontal, X } from 'lucide-react';
import { consultar, type BaseFacetas } from '@/lib/facetas';
import { aQuery, DIMENSIONES, ETIQUETA_DIM, FILTROS_VACIOS, type Dimension, type FiltrosMulti } from '@/lib/filtros-comun';
import { Selector } from './selector';

export function FiltrosBarra({ base, activos, corte }: { base: BaseFacetas; activos: FiltrosMulti; corte: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pendiente, start] = useTransition();
  const [copia, copiar] = useState('');
  const [f, actualizar] = useState(activos);
  const [previo, anterior] = useState(activos);
  if (activos !== previo) { anterior(activos); actualizar(activos); }
  const resultado = consultar(base, f);
  const todas = consultar(base, FILTROS_VACIOS).filtros;
  const cuenta = DIMENSIONES.reduce((n,d) => n + f[d].length, 0);
  function navegar(next: FiltrosMulti) {
    actualizar(next); copiar('');
    const q = aQuery(next);
    start(() => router.replace(q ? `/tablero?${q}` : '/tablero', {scroll:false}));
  }
  function cambia(dim: Dimension, vs: string[]) {
    const next = {...f,[dim]:vs};
    // Al cambiar el padre se conservan solo los hijos todavía compatibles.
    for (const hijo of DIMENSIONES.slice(DIMENSIONES.indexOf(dim)+1)) {
      const opciones = consultar(base, {...next, ...Object.fromEntries(DIMENSIONES.slice(DIMENSIONES.indexOf(hijo)).map(k=>[k,[]]))}).filtros[hijo];
      next[hijo] = next[hijo].filter(v => opciones.some(o => o.valor === v && o.cuenta !== 0));
    }
    navegar(next);
  }
  const meses = resultado.filtros.periodo.filter(o => o.cuenta).map(o => o.valor);
  const desde = new Date(`${corte.slice(0,7)}-01T00:00:00Z`);
  desde.setUTCMonth(desde.getUTCMonth()-2);
  const atajos = [
    {texto:'Todo', valores:[]},
    {texto:'Este año', valores:meses.filter(v => v.startsWith(corte.slice(0,4)))},
    {texto:'Últimos 3 meses', valores:meses.filter(v => v >= desde.toISOString().slice(0,7) && v <= corte.slice(0,7))},
  ];
  function controles() {
    return <div className="facetas-fila">{DIMENSIONES.map(d =>
      <Selector key={d} label={ETIQUETA_DIM[d]} opciones={resultado.filtros[d]} elegidos={f[d]}
        cambiar={vs => cambia(d,vs)} atajos={d === 'periodo' ? atajos : []} placeholder={d === 'periodo' ? 'Todo el periodo' : 'Todos'} />)}</div>;
  }
  const chips = <div className="facetas-chips">{DIMENSIONES.flatMap(d => f[d].map(v =>
    <button type="button" key={`${d}:${v}`} onClick={() => cambia(d,f[d].filter(x => x !== v))}>
      {ETIQUETA_DIM[d]}: {todas[d].find(o => o.valor === v)?.texto ?? 'No disponible'} <X size={14} aria-label="Quitar" />
    </button>))}{cuenta > 0 && <button className="quitar-todo" type="button" onClick={() => navegar(FILTROS_VACIOS)}>Limpiar todo</button>}</div>;
  const estados = todas.estado.filter(o => f.estado.includes(o.valor)).map(o=>o.texto);
  const n = resultado.municipios.length;
  const resumen = `${resultado.registros} ${resultado.registros === 1 ? 'registro' : 'registros'} en ${n} ${n === 1 ? 'municipio' : 'municipios'}${estados.length ? ` de ${estados.join(', ')}` : ''}.`;
  return <div data-parte="filtros">
    <div className="facetas-escritorio">{controles()}</div>
    <button type="button" className="abrir-filtros" onClick={() => dialog.current?.showModal()}><SlidersHorizontal size={17} aria-hidden />Filtros ({cuenta})</button>
    <dialog className="hoja-filtros" ref={dialog} aria-label="Filtros del tablero">
      <div className="hoja-titulo"><h2>Filtros</h2><button type="button" aria-label="Cerrar filtros" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      {controles()}{chips}<p role="status">{resumen}</p><button className="mesa-boton" type="button" onClick={() => dialog.current?.close()}>Ver resultados</button>
    </dialog>
    {cuenta > 0 && chips}
    <div className="facetas-pie"><p aria-live="polite" aria-atomic="true">
      {pendiente ? 'Actualizando…' : resumen}{(f.servicio.length > 0 || f.periodo.length > 0) && ` Actividad: ${resultado.unidades.map(u => `${u.cantidad} ${u.nombre}`).join('; ') || 'sin resultados'}.`}
      {resultado.sinCruce > 0 && ` No se pudo verificar el municipio de ${resultado.sinCruce} registros de actividad; se excluyen del desglose territorial.`}
    </p>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); copiar('Enlace copiado'); }
        catch { copiar('Copia la dirección de la barra del navegador'); } }}><Link2 size={15} aria-hidden />{copia || 'Copiar enlace de esta vista'}</button>
    </div>
    {cuenta > 0 && <p className="mesa-nota">Personas, donantes y edad: solo programa. Territorio, servicio y periodo: actividad y municipios. El cruce por lugar incluye solo registros identificados con municipio verificable.</p>}
  </div>;
}
