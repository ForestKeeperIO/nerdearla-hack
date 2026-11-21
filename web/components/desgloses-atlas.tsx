import { etiquetaPeriodo } from '@/lib/filtros-comun';
import type { Punto } from '@/lib/tablero-impacto';

export function Distribucion({ titulo, unidad, serie }: { titulo: string; unidad: string; serie: Punto[] }) {
  const max = Math.max(...serie.map(x => x.n),1);
  return <section className="atlas-panel atlas-distribucion"><header><h2>{titulo}</h2><span>{unidad}</span></header>
    {serie.length ? <table aria-label={`${titulo}: ${unidad}`}><tbody>{serie.map(x =>
      <tr key={x.nombre}><th scope="row">{x.nombre}</th><td><i aria-hidden style={{width:`${100*x.n/max}%`}}/></td><td>{x.n}</td></tr>)}</tbody></table> :
      <p className="atlas-vacio">Sin datos en esta selección.</p>}
  </section>;
}

export function PorMes({ serie }: { serie: Punto[] }) {
  const max = Math.max(...serie.map(x => x.n),1);
  return <section className="atlas-panel atlas-tiempo"><header><h2>Actividad por mes</h2><span>Registros</span></header>
    {serie.length ? <div className="atlas-meses"><ol>{serie.map(x =>
      <li key={x.clave}><div><b>{x.n}</b><i aria-hidden style={{height:`${96*x.n/max}px`}}/></div>
        <time dateTime={x.clave}>{etiquetaPeriodo(x.clave)}</time></li>)}</ol></div> :
      <p className="atlas-vacio">Sin actividad fechada en esta selección.</p>}
  </section>;
}
