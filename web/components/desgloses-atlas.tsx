import { UsersRound } from 'lucide-react';
import type { Punto } from '@/lib/tablero-impacto';

export function Distribucion({ titulo, unidad, serie }: { titulo: string; unidad: string; serie: Punto[] }) {
  const max = Math.max(...serie.map(x => x.n),1);
  return <section className="atlas-panel atlas-distribucion"><header><h2><UsersRound aria-hidden/>{titulo}</h2><span>{unidad}</span></header>
    {serie.length ? <table aria-label={`${titulo}: ${unidad}`}><tbody>{serie.map(x =>
      <tr key={x.nombre}><th scope="row">{x.nombre}</th><td><i aria-hidden style={{width:`${100*x.n/max}%`}}/></td><td>{x.n}</td></tr>)}</tbody></table> :
      <p className="atlas-vacio">Sin datos en esta selección.</p>}
  </section>;
}
