'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { normaliza, type Opcion } from '@/lib/filtros-comun';

export type Atajo = { texto: string; valores: string[] };
function resalta(texto: string, q: string) {
  const i = normaliza(texto).indexOf(q);
  if (!q || i < 0) return texto;
  return <>{texto.slice(0,i)}<mark>{texto.slice(i,i+q.length)}</mark>{texto.slice(i+q.length)}</>;
}

export function Selector({ label, opciones, elegidos, cambiar, unico = false, atajos = [], placeholder }: {
  label: string; opciones: Opcion[]; elegidos: string[]; cambiar: (vs: string[]) => void;
  unico?: boolean; atajos?: Atajo[]; placeholder?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [abierto, abrir] = useState(false);
  const [busca, buscar] = useState('');
  const [indice, apuntar] = useState(0);
  const [movido, mover] = useState(false);
  const q = normaliza(busca.trim());
  const alf = (a: Opcion, b: Opcion) => a.texto.localeCompare(b.texto, 'es');
  const lista = opciones.filter(o => [o.texto, ...o.alias ?? []].some(s => normaliza(s).includes(q))).sort(alf);
  const top = !q && lista.some(o => o.cuenta !== undefined)
    ? [...lista].filter(o => (o.cuenta ?? 0) > 0).sort((a,b) => (b.cuenta ?? 0) - (a.cuenta ?? 0) || alf(a,b)).slice(0,5) : [];
  const resto = lista.filter(o => !top.includes(o)).sort((a,b) => (a.grupo ?? '').localeCompare(b.grupo ?? '', 'es') || alf(a,b));
  const filas = [
    ...(!q ? atajos.map((a,i) => ({ o: { texto: a.texto, valor: `atajo-${i}` } as Opcion, grupo: 'Periodos rápidos', atajo: a })) : []),
    ...top.map(o => ({ o, grupo: 'Más frecuentes', atajo: null })),
    ...resto.map(o => ({ o, grupo: o.grupo || (top.length ? 'Más opciones' : ''), atajo: null })),
  ];
  const actual = Math.min(indice, filas.length - 1);
  const visible = (i: number) => `${id}-op-${i}`;
  useEffect(() => {
    if (abierto && actual >= 0 && movido) document.getElementById(visible(actual))?.scrollIntoView({block:'nearest'});
  }, [abierto, actual, id, movido]); // la posición activa pertenece a esta lista
  function cerrar() { abrir(false); buscar(''); apuntar(0); mover(false); }
  function elegir(i: number) {
    const fila = filas[i];
    if (!fila) return;
    const { o, atajo } = fila;
    const marcado = elegidos.includes(o.valor);
    if (!marcado && o.cuenta === 0) return;
    if (atajo) cambiar(atajo.valores);
    else cambiar(unico ? [o.valor] : marcado ? elegidos.filter(v => v !== o.valor) : [...elegidos, o.valor]);
    if (unico || atajo) cerrar();
    input.current?.focus();
  }
  const resumen = unico ? opciones.find(o => o.valor === elegidos[0])?.texto
    : elegidos.length === 1 ? opciones.find(o => o.valor === elegidos[0])?.texto : elegidos.length ? 'Varios' : undefined;
  return <div className="selector" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) cerrar(); }}>
    <label htmlFor={id}>{label}{!unico && elegidos.length > 0 && <span aria-hidden>{elegidos.length}</span>}</label>
    <div className="selector-campo" onClick={() => { abrir(true); input.current?.focus(); }}>
      <input ref={input} id={id} autoComplete="off" role="combobox" aria-expanded={abierto}
        aria-controls={`${id}-lista`} aria-autocomplete="list" aria-activedescendant={abierto && actual >= 0 ? visible(actual) : undefined}
        value={abierto ? busca : resumen ?? ''} placeholder={abierto ? 'Buscar…' : placeholder ?? 'Todos'}
        onClick={() => abrir(true)}
        onChange={e => { buscar(e.target.value); abrir(true); apuntar(0); mover(false); }}
        onKeyDown={e => {
          if (e.key === 'Escape' && abierto) { e.preventDefault(); e.stopPropagation(); cerrar(); }
          else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); abrir(true); mover(true);
            apuntar(abierto && filas.length ? (actual + (e.key === 'ArrowDown' ? 1 : -1) + filas.length) % filas.length : 0);
          } else if (e.key === 'Enter' || (e.key === ' ' && (!busca || movido))) {
            e.preventDefault(); if (abierto) elegir(actual); else abrir(true);
          } else if (e.key === 'Backspace' && !busca && !unico && elegidos.length) {
            e.preventDefault(); cambiar(elegidos.slice(0,-1));
          } else if (e.key === 'Tab') cerrar();
          else if (!abierto && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault(); abrir(true); buscar(e.key); apuntar(0);
          }
        }} />
      <ChevronDown size={16} aria-hidden />
    </div>
    <div id={`${id}-lista`} role="listbox" aria-label={`Opciones de ${label}`} aria-multiselectable={!unico} hidden={!abierto} className="selector-lista">
      {filas.map(({o,grupo,atajo},i) => {
        const elegido = !atajo && elegidos.includes(o.valor);
        const otro = q && !normaliza(o.texto).includes(q) ? o.alias?.find(a => normaliza(a).includes(q)) : '';
        return <div key={o.valor} role="presentation">
          {grupo && grupo !== filas[i-1]?.grupo && <div className="selector-grupo" role="presentation">{grupo}</div>}
          <div role="option" id={visible(i)} aria-selected={elegido} aria-disabled={o.cuenta === 0 && !elegido}
            data-activo={i === actual} onMouseDown={e => e.preventDefault()} onClick={() => elegir(i)}>
            <span>{resalta(o.texto,q)}{otro && <small>{resalta(otro,q)}</small>}{o.grupo && grupo !== o.grupo && <small>{o.grupo}</small>}</span>
            {o.cuenta !== undefined && <span className="selector-cuenta" title={o.unidad}>{o.cuenta}<span className="visually-hidden"> {o.unidad}</span></span>}
            {elegido && <Check size={15} aria-hidden />}
          </div>
        </div>;
      })}
      {!filas.length && <p className="selector-vacio">Sin coincidencias. Prueba con otro nombre.</p>}
    </div>
  </div>;
}
