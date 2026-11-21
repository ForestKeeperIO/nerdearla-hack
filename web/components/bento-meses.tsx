'use client';

import { useState } from 'react';
import { ChartNoAxesColumn, ChevronLeft, ChevronRight } from 'lucide-react';
import { etiquetaPeriodo } from '@/lib/filtros-comun';
import { indiceMes, mesDeIndice } from '@/lib/seleccion-tablero';
import type { Punto } from '@/lib/tablero-impacto';

export function MesesBento({ serie, desde, hasta }: { serie: Punto[]; desde: string; hasta: string }) {
  const [retroceso, atras] = useState(0);
  const ini = desde || serie[0]?.clave || hasta, fin = hasta || serie.at(-1)?.clave || desde;
  const a = indiceMes(ini), b = indiceMes(fin);
  const paginas = Math.max(1,Math.ceil((b-a+1)/6));
  const pagina = Math.min(retroceso,paginas-1);
  const ultimo = b-pagina*6, primero = Math.max(a,ultimo-5);
  const meses = Array.from({length: Math.max(0,ultimo-primero+1)},(_,i) => {
    const mes = mesDeIndice(primero+i);
    return { mes, n:serie.find(x => x.clave===mes)?.n ?? null };
  });
  const max = Math.max(1,...serie.map(s => s.n));
  return <section className="atlas-panel bento-meses">
    <header><h2><ChartNoAxesColumn aria-hidden />Actividad mensual</h2></header>
    {meses.length ? <>
      <div className="bento-fechas"><span>{etiquetaPeriodo(meses[0].mes)} – {etiquetaPeriodo(meses.at(-1)!.mes)}</span>
        {paginas>1 && <div><button disabled={pagina>=paginas-1} onClick={() => atras(pagina+1)} aria-label="Meses anteriores"><ChevronLeft/></button>
          <button disabled={pagina===0} onClick={() => atras(pagina-1)} aria-label="Meses siguientes"><ChevronRight/></button></div>}</div>
      <div className="bento-columnas" aria-label="Registros por mes">{meses.map(({mes,n}) => <div key={mes} title={`${etiquetaPeriodo(mes)}: ${n===null ? 'sin dato' : `${n} registros`}`}>
        <div><b>{n ?? '—'}</b><i aria-hidden className={n===null ? 'rayado' : undefined} style={{height:n===null ? '16px' : `${Math.max(2,100*n/max)}px`}}/></div>
        <time dateTime={mes} aria-label={etiquetaPeriodo(mes)}>{etiquetaPeriodo(mes).split(' ')[0]}</time>
      </div>)}</div>
      <div className="bento-leyenda"><span><i/>Registros</span>{meses.some(m => m.n===null) && <span><i className="rayado"/>Sin dato</span>}</div>
    </> : <p className="atlas-vacio">Sin actividad fechada en esta selección.</p>}
  </section>;
}
