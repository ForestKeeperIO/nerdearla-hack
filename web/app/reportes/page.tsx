import Link from 'next/link';
import { ArrowUpRight, FileDown, HeartPulse, MapPinned } from 'lucide-react';
import { fechaEs } from '@/lib/comun';
import { porServicio } from '@/lib/reportes';
import { informeSeleccion } from '@/lib/reporte-seleccion';
import { contextoReporte,type QueryReporte } from '@/lib/contexto-reporte';
import { nombrePrograma } from '@/lib/catalogo';
import { AtlasReporte } from '@/components/atlas-reporte';

export const dynamic = 'force-dynamic';

export default async function Indice({searchParams}:{searchParams:Promise<QueryReporte>}) {
  const q=await searchParams;
  const {params,f,periodo}=contextoReporte(q);
  const r = await informeSeleccion(q);
  const nombre=f.programa.length?f.programa.map(nombrePrograma).join(', '):'Global';
  const fuentes = r.fuentes;
  const servicios = porServicio(r.lineas).filter(s=>s.n>=5).slice(0,5);
  const corte = fuentes.map(f => f.fecha_corte).sort().at(-1);
  return <div className="archivo-eira">
    <div className="apertura"><h1>Reportes</h1><p>{nombre}. {periodo}. La misma selección para el informe de aliados y el oficio municipal.</p></div>
    <div className="catalogo-reportes">
      {([['aliados','Para aliados estratégicos','Impacto por programa',HeartPulse],['territorial','Para gobierno y hospitales','Presencia territorial',MapPinned]] as const).map(([id,audiencia,titulo,Icono],i)=><article key={id} className={`tapa ${i?'tapa-mapa':''}`}>
        <div className="mini-cabeza"><Icono aria-hidden/><span>{audiencia}</span><Link href={`/reportes/${id}?${params}`} aria-label={`Leer ${titulo}`}><ArrowUpRight/></Link></div>
        <div className="muestra-corte"><div><b>{fuentes.length ? (i ? r.municipios.length : r.impactadas>0 && r.impactadas<5 ? '<5' : r.impactadas) : '—'}</b><span>{i?'municipios con actividad':'personas impactadas'} en la selección</span></div>
          <div className="miniatura-reporte" aria-hidden="true">{i ? <AtlasReporte municipios={r.municipios} nacional={false}/> :
            <svg viewBox="0 0 160 88">{servicios.map((s,j)=><rect key={j} x={j*32+3} y={84-72*s.n/servicios[0].n} width="20" height={72*s.n/servicios[0].n} rx="10"><title>{s.label}</title></rect>)}</svg>}</div></div>
        <h2><Link href={`/reportes/${id}?${params}`}>{titulo}</Link></h2><p>{corte?`Corte del ${fechaEs(corte)}`:'Sin fecha de corte'}</p>
        <div className="acciones-lectura"><Link href={`/reportes/${id}?${params}`}>Leer reporte</Link><a href={`/reportes/${id}/informe.pdf?${params}`}><FileDown aria-hidden/>Descargar PDF</a></div>
      </article>)}
    </div>
    <div className="pie-registro"><span>Fuente: registros consolidados de EIRA</span><span>{corte ? `Último corte: ${fechaEs(corte)}` : 'Sin fecha de corte'}</span></div>
  </div>;
}
