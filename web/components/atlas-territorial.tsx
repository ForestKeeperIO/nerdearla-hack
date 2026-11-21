import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { ChevronRight, ListOrdered, MapPinned, MoveUpRight } from 'lucide-react';
import type { Lugar } from '@/lib/tablero-impacto';
import { consultaDe, type Seleccion } from '@/lib/seleccion-tablero';

type Mapa = { vista: string; trazos: Record<string,string> };
function geometria(id: string): Mapa {
  if (!/^(mx|[0-9]{2})$/.test(id)) throw new Error('Clave territorial no válida');
  return JSON.parse(readFileSync(/* turbopackIgnore: true */ join(process.cwd(),'publicos','atlas',`${id}.json`),'utf8'));
}

export function AtlasTerritorial({ lugares, f, nacional }: { lugares: Lugar[]; f: Seleccion; nacional: boolean }) {
  const estados = [...new Set(lugares.map(l => l.estado))];
  const state = !nacional && estados.length === 1 ? estados[0] : null;
  const mapa = geometria(state || 'mx'), mexico = state ? geometria('mx') : null;
  const entidad = state ? lugares[0].entidad : 'México';
  const href = (s: Seleccion) => `/tablero?${consultaDe(s)}`;
  const grupos = new Map<string, { nombre: string; n: number }>();
  for (const l of lugares) {
    const key = state ? l.clave : l.estado;
    grupos.set(key,{ nombre: state ? l.nombre : l.entidad, n: (grupos.get(key)?.n ?? 0)+l.n });
  }
  const max = Math.max(...lugares.map(l => l.n),1);
  return <>
    <section className="atlas-panel atlas-mapa" aria-labelledby="mapa-titulo">
      <header><h2 id="mapa-titulo"><MapPinned aria-hidden/>Presencia territorial</h2><span>{state ? 'Municipal' : 'Estatal'}</span></header>
      <div className="atlas-lienzo">
        <div className="atlas-localizador">
          {mexico && <svg viewBox={mexico.vista} aria-hidden>{Object.entries(mexico.trazos).map(([id,d]) =>
            <path key={id} d={d} className={id === state ? 'presente' : undefined}/>)}</svg>}
          <p>{state ? <><Link scroll={false} href={`${href(f)}&mapa=mx`}>México</Link><ChevronRight size={13} aria-hidden/>{entidad}</> : entidad}</p>
        </div>
        <svg className="atlas-geo" viewBox={mapa.vista} role="group" aria-label={`Mapa de presencia en ${entidad}`}>
          {Object.entries(mapa.trazos).map(([id,d]) => {
            const dato = grupos.get(id);
            return dato ? <a key={id} href={href(state ? {...f,estado:[state],municipio:[id]} : {...f,estado:[id],municipio:f.municipio.filter(m => m.startsWith(id))})}
              aria-label={`Filtrar ${dato.nombre}: ${dato.n} registros`}><title>{`${dato.nombre}: ${dato.n} registros`}</title><path className="presente" d={d}/></a> :
              <path key={id} aria-hidden d={d}/>;
          })}
        </svg>
      </div>
      <footer><span><i/>Con actividad</span><small>INEGI · Marco Geoestadístico 2025</small></footer>
    </section>
    <section className="atlas-panel atlas-ranking"><header><h2><ListOrdered aria-hidden/>Por municipio</h2><span>Registros</span></header>
      {lugares.length ? <ol>{lugares.map(l => <li key={l.clave}><Link scroll={false} href={href({...f,estado:[l.estado],municipio:[l.clave]})}>
        <span>{l.nombre}<MoveUpRight size={13} aria-hidden /></span><b>{l.n}</b>
        <i aria-hidden style={{width:`${100*l.n/max}%`}}/></Link></li>)}</ol> : <p className="atlas-vacio">Sin municipios con actividad en esta selección.</p>}
      {lugares.length > 0 && <footer>Total con municipio <b>{lugares.reduce((n,l) => n+l.n,0)}</b></footer>}
    </section>
  </>;
}
