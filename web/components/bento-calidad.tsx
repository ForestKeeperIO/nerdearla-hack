import Link from 'next/link';
import { ArrowUpRight, CheckCheck, FileSpreadsheet, Files, Layers2 } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { fechaEs } from '@/lib/comun';
import type { Carga, Servicio } from '@/lib/tablero-impacto';

export function ParesBento({ decididos, pendientes }: { decididos: number; pendientes: number }) {
  const total = decididos+pendientes, p = total ? Math.round(100*decididos/total) : null;
  return <section className="atlas-panel bento-pares">
    <header><h2><CheckCheck aria-hidden />Revisión de pares</h2><Link className="bento-salto" aria-label="Ir a Calidad para revisar los pares" href="/informe/global/calidad"><ArrowUpRight aria-hidden /></Link></header>
    <div className="bento-medidor">
      <svg viewBox="0 0 192 110" aria-hidden>
        <defs><pattern id="pares-rayado" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="5" height="5" fill="var(--bento-lienzo)"/><rect width="1.5" height="5" fill="var(--tinta-tenue)"/>
        </pattern></defs>
        <path d="M17 98a79 79 0 0 1 158 0" stroke="url(#pares-rayado)" />
        {decididos>0 && <path d="M17 98a79 79 0 0 1 158 0" pathLength="100" stroke="var(--vino)"
          strokeDasharray={`${100*decididos/total} 100`} />}
      </svg>
      <div><strong>{p===null ? '—' : `${p}%`}</strong><span>{p===null ? 'Sin pares' : 'decididos'}</span></div>
    </div>
    <div className="bento-leyenda"><span><i/>{decididos} decididos</span><span><i className="rayado"/>{pendientes} pendientes</span></div>
    <footer>Todos los programas</footer>
  </section>;
}

export function CargasBento({ cargas }: { cargas: Carga[] }) {
  return <section className="atlas-panel bento-cargas">
    <header><h2><Files aria-hidden />Cargas recientes</h2><Link href="/subir" className="bento-salto" aria-label="Ir a Subir archivos"><ArrowUpRight aria-hidden /></Link></header>
    {cargas.length ? <ul>{cargas.map(c =>
      <li key={`${c.nombre}-${c.fecha}`}><span className="bento-fichero"><FileSpreadsheet aria-hidden /></span>
        <div><strong title={c.nombre}>{c.nombre}</strong><small>{c.programa} · {fechaEs(c.fecha)}</small></div>
        <div className="bento-valoracion">{c.puntaje !== null && <svg viewBox="0 0 26 26" role="img" aria-label={`Calidad: ${c.puntaje} de 100`}>
          <circle cx="13" cy="13" r="10" fill="none" stroke="var(--linea)" strokeWidth="3"/>
          <circle cx="13" cy="13" r="10" fill="none" stroke="var(--vino)" strokeWidth="3" pathLength="100"
            strokeDasharray={`${c.puntaje} 100`} transform="rotate(-90 13 13)" /></svg>}
          {c.estrellas===null ? <small>Sin calificar</small> : <StarRating valor={c.estrellas} />}</div>
      </li>)}</ul> : <p className="atlas-vacio">No hay archivos en esta selección.</p>}
  </section>;
}

export function ServiciosBento({ servicios }: { servicios: Servicio[] }) {
  const unidades = [...new Set(servicios.map(s => s.unidad))];
  return <section className="atlas-panel bento-servicios"><header><h2><Layers2 aria-hidden />Servicios por unidad</h2></header>
    {unidades.length ? <div className="bento-unidades">{unidades.map(u => {
      const lista = servicios.filter(s => s.unidad===u), max = Math.max(...lista.map(s => s.cantidad),1);
      return <div key={u}><h3>{u}</h3><dl>{lista.map(s =>
        <div key={s.clave}><dt>{s.nombre}</dt><dd>{s.cantidad.toLocaleString('es-MX')}</dd>
          <i aria-hidden style={{width:`${100*s.cantidad/max}%`}}/></div>)}</dl></div>;
    })}</div> : <p className="atlas-vacio">Sin servicios en esta selección.</p>}
  </section>;
}
