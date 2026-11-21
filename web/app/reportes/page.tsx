import Link from 'next/link';
import { ArrowUpRight, FileDown, HeartPulse, MapPinned } from 'lucide-react';
import { fechaEs } from '@/lib/comun';
import { leerReporte, porServicio } from '@/lib/reportes';
import { AtlasReporte } from '@/components/atlas-reporte';

export const dynamic = 'force-dynamic';

export default async function Indice() {
  const r = await leerReporte('tamizaje-rosa');
  const fuentes = r.fuentes;
  const servicios = porServicio(r.lineas).filter(s=>s.n>=5).slice(0,5);
  const corte = fuentes.map(f => f.fecha_corte).sort().at(-1);
  return <div className="archivo-eira">
    <div className="apertura"><h1>Reportes</h1><p>Dos lecturas del trabajo de EIRA: el impacto por programa y la presencia en cada municipio.</p></div>
    <div className="catalogo-reportes">
      {([['aliados','Para aliados estratégicos','Impacto por programa',HeartPulse],['territorial','Para gobierno y hospitales','Presencia territorial',MapPinned]] as const).map(([id,audiencia,titulo,Icono],i)=><article key={id} className={`tapa ${i?'tapa-mapa':''}`}>
        <div className="mini-cabeza"><Icono aria-hidden/><span>{audiencia}</span><Link href={`/reportes/${id}`} aria-label={`Leer ${titulo}`}><ArrowUpRight/></Link></div>
        <div className="muestra-corte"><div><b>{fuentes.length ? (i ? r.municipios.length : r.impactadas>0 && r.impactadas<5 ? '<5' : r.impactadas) : '—'}</b><span>{i?'municipios con actividad':'personas impactadas'} en Tamizaje Rosa</span></div>
          <div className="miniatura-reporte" aria-hidden="true">{i ? <AtlasReporte municipios={r.municipios} nacional={false}/> :
            <svg viewBox="0 0 160 88">{servicios.map((s,j)=><rect key={j} x={j*32+3} y={84-72*s.n/servicios[0].n} width="20" height={72*s.n/servicios[0].n} rx="10"><title>{s.label}</title></rect>)}</svg>}</div></div>
        <h2><Link href={`/reportes/${id}`}>{titulo}</Link></h2><p>{corte?`Corte del ${fechaEs(corte)}`:'Sin fecha de corte'}</p>
        <div className="acciones-lectura"><Link href={`/reportes/${id}`}>Leer reporte</Link><Link href={`/reportes/${id}?imprimir=1`}><FileDown aria-hidden/>Descargar PDF</Link></div>
      </article>)}
    </div>
    <div className="pie-registro"><span>Fuente: registros consolidados de EIRA</span><span>{corte ? `Último corte: ${fechaEs(corte)}` : 'Sin fecha de corte'}</span></div>
  </div>;
}
