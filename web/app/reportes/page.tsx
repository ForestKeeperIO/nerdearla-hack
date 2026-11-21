import Link from 'next/link';
import { ArrowUpRight, Archive, HeartPulse, MapPinned } from 'lucide-react';
import { fechaEs } from '@/lib/comun';
import { cifraPublica, porServicio } from '@/lib/reportes';
import { informeSeleccion } from '@/lib/reporte-seleccion';
import { contextoReporte,type QueryReporte } from '@/lib/contexto-reporte';
import { nombrePrograma } from '@/lib/catalogo';
import { AtlasReporte } from '@/components/atlas-reporte';
import { audiencias, historialReportes, revisionFuentes, rutaEdicion, titulos } from '@/lib/archivo-reportes';
import { generarReporte } from '@/lib/generar-reporte';
import { BotonGenerar } from '@/components/boton-generar';

export const dynamic = 'force-dynamic';
const avisos:Record<string,string>={
  'sin-datos':'No hay actividad publicable con esa selección. Prueba con otro periodo.',
  archivo:'No se pudo guardar la edición con sus dos archivos. Intenta de nuevo.',
  consulta:'Esta vista de consulta no permite guardar reportes.',
  seleccion:'La selección no es válida. Regresa al Tablero para elegir los filtros.',
  cambio:'Acaba de cambiar una fuente. Revisa el nuevo corte y vuelve a generar.',
};
function hace(iso:string) {
  const min=Math.max(0,Math.floor((Date.now()-Date.parse(iso))/60000));
  return min===0?'Generado hace un momento':min<60?`Generado hace ${min} min`:min<1440?`Generado hace ${Math.floor(min/60)} h`:`Generado hace ${Math.floor(min/1440)} días`;
}

export default async function Indice({searchParams}:{searchParams:Promise<QueryReporte>}) {
  // Sin filtros, "Sacar reporte" del Tablero representa todos los programas.
  const q:QueryReporte={origen:'tablero',...await searchParams};
  const {params,f,periodo}=contextoReporte(q);
  const pagina=Math.max(0,Math.min(99999,Number.parseInt(String(q.pagina),10)||0));
  const [{items,mas},revision,r]=await Promise.all([historialReportes(pagina),revisionFuentes(),informeSeleccion(q)]);
  const nombre=f.programa.length?f.programa.map(nombrePrograma).join(', '):'Global';
  const fuentes = r.fuentes;
  const servicios = porServicio(r.lineas).filter(s=>s.n>=5).slice(0,5);
  const corte = r.corte;
  return <div className="archivo-eira">
    <div className="apertura"><h1>Reportes generados</h1><p>Cada edición conserva las cifras y los archivos del día en que se generó.</p></div>
    {q.aviso && <p role="alert" className="sin-dato">{avisos[String(q.aviso)]||'Revisa la selección.'}</p>}
    {q.generado && items.some(p=>p.id===q.generado) && <p role="status" className="aviso-edicion">Reporte guardado. El PDF y el CSV están listos.</p>}
    <section aria-label="Historial de reportes" className="historial-reportes">
      {items.length===0 && <div className="archivo-vacio"><Archive aria-hidden/><div><h2>{pagina?'No hay más ediciones':'Todavía no hay reportes guardados'}</h2><p>Elige una plantilla en «Generar nuevo» para guardar el primer corte.</p></div></div>}
      {items.map(p=>{
        const url=rutaEdicion(p.id), aliados=p.tipo==='aliados', Icono=aliados?HeartPulse:MapPinned;
        return <article key={p.id} className="edicion" data-id={p.id}><header><Icono aria-hidden/>{audiencias[p.tipo]}<time dateTime={p.generado} title={new Date(p.generado).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}>{hace(p.generado)}</time></header>
          <h2><Link href={url}>{titulos[p.tipo]}</Link></h2><p>{p.seleccion}</p>
          <div className="cifra-edicion"><strong>{aliados?cifraPublica(p.impactadas):p.municipios}</strong><span>{aliados?'personas impactadas':'municipios con actividad'}</span></div>
          <p>Corte: {fechaEs(p.corte)} · Folio {p.version}</p>
          {p.revision!==revision && <p className="aviso-edicion">Hay datos más nuevos que este reporte</p>}
          <div className="acciones-lectura"><Link href={url}>Abrir <ArrowUpRight aria-hidden/></Link><a href={`${url}/pdf`}>PDF</a><a href={`${url}/csv`}>CSV</a></div>
        </article>;
      })}
    </section>
    {(pagina>0||mas)&&<nav aria-label="Páginas del historial">{pagina>0 && <Link href={`/reportes?${params}&pagina=${pagina-1}`}>Más recientes</Link>} {mas && <Link href={`/reportes?${params}&pagina=${pagina+1}`}>Anteriores</Link>}</nav>}
    <div className="apertura apertura-plantillas"><h2>Generar nuevo</h2><p>{nombre}. {periodo}. Se aplicará la selección del Tablero a la edición nueva.</p></div>
    <div className="catalogo-reportes">
      {([['aliados','Para aliados estratégicos','Impacto por programa',HeartPulse],['territorial','Para gobierno y hospitales','Presencia territorial',MapPinned]] as const).map(([id,audiencia,titulo,Icono],i)=><article key={id} className={`tapa ${i?'tapa-mapa':''}`}>
        <div className="mini-cabeza"><Icono aria-hidden/><span>{audiencia}</span><Link href={`/reportes/${id}?${params}`} aria-label={`Leer ${titulo}`}><ArrowUpRight/></Link></div>
        <div className="muestra-corte"><div><b>{fuentes.length ? (i ? r.municipios.length : r.impactadas>0 && r.impactadas<5 ? '<5' : r.impactadas) : '—'}</b><span>{i?'municipios con actividad':'personas impactadas'} en la selección</span></div>
          <div className="miniatura-reporte" aria-hidden="true">{i ? <AtlasReporte municipios={r.municipios} nacional={false}/> :
            <svg viewBox="0 0 160 88">{servicios.map((s,j)=><rect key={j} x={j*32+3} y={84-72*s.n/servicios[0].n} width="20" height={72*s.n/servicios[0].n} rx="10"><title>{s.label}</title></rect>)}</svg>}</div></div>
        <h2><Link href={`/reportes/${id}?${params}`}>{titulo}</Link></h2><p>{corte?`Corte del ${fechaEs(corte)}`:'Sin fecha de corte'}</p>
        <div className="acciones-lectura"><form action={generarReporte.bind(null,id,params.toString())}><BotonGenerar/></form><Link href={`/reportes/${id}?${params}`}>Leer reporte</Link></div>
      </article>)}
    </div>
    <div className="pie-registro"><span>Fuente: registros consolidados de EIRA</span><span>{corte ? `Último corte: ${fechaEs(corte)}` : 'Sin fecha de corte'}</span></div>
  </div>;
}
