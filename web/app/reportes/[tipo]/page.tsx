import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotonImprimir } from '@/components/imprimir';
import { AtlasReporte } from '@/components/atlas-reporte';
import { AnilloDato } from '@/components/anillo-dato';
import { ImprimirAlAbrir } from '@/components/imprimir-al-abrir';
import { ArrowUpRight, HeartPulse, MapPin, UsersRound, CalendarDays, BadgeCheck } from 'lucide-react';
import { informesActivos, nombrePrograma, pluralTipo } from '@/lib/catalogo';
import { esAlcance } from '@/lib/informe';
import { fechaEs } from '@/lib/comun';
import { cifraPublica as cifra, esReporte, porServicio } from '@/lib/reportes';
import { contextoReporte, type QueryReporte } from '@/lib/contexto-reporte';
import { informeSeleccion } from '@/lib/reporte-seleccion';
import './hoja.css';

export const dynamic = 'force-dynamic';
const pendiente = 'En construcción';

function Barras({ items }: {items: {label:string;n:number}[]}) {
  const max = Math.max(1,...items.map(s=>s.n));
  return <ul className="rayas">{items.map(s=><li key={s.label}><span>{s.label}</span><b>{cifra(s.n)}</b><i aria-hidden="true" style={{width:s.n>=5?`${100*s.n/max}%`:'0%'}}/></li>)}</ul>;
}

export default async function ReportePagina({params, searchParams}: {params:Promise<{tipo:string}>;searchParams:Promise<QueryReporte>}) {
  const {tipo} = await params, q = await searchParams;
  const {programa,f,params:url,periodo} = contextoReporte(q);
  if (!esReporte(tipo) || f.programa.some(id=>!esAlcance(id))) notFound();
  const r = await informeSeleccion(q), territorio = tipo==='territorial';
  const localidad = territorio && (q.mun || f.municipio.length===1) ? r.municipios.find(m=>m.clave===(q.mun||f.municipio[0])) : undefined;
  const municipios = localidad ? [localidad] : r.municipios;
  const lineas = localidad ? r.lineas.filter(l=>l.cve===localidad.clave) : r.lineas;
  const servicios = porServicio(lineas);
  const folio = `EIRA-${territorio?'T':'A'}-${programa}-${localidad?.clave||'general'}-${r.version}`;
  const nombre = f.programa.length ? f.programa.map(nombrePrograma).join(', ') : 'Global';
  const corte = r.corte ? fechaEs(r.corte) : 'Sin fecha de corte';
  const nacional = q.mapa==='mexico' || q.mapa==='mx' || (!q.mapa && municipios.some(m=>m.estado_clave!=='14'));
  const excluidas = r.fuentes.reduce((a,f)=>a+f.filas_omitidas,0);
  const ocultos = (excepto:string[])=>[...url.entries()].filter(([k])=>!excepto.includes(k)).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>);
  const form = <form className="lector-filtros no-imprimir">{ocultos(['programa','mun'])}
    <label>Programa<select name="programa" defaultValue={f.programa.join(',')||'global'}>{f.programa.length>1 && <option value={f.programa.join(',')}>{nombre}</option>}{[...informesActivos().map(p=>[p.id,p.nombre]),['global','Global']].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
    <button className="btn btn--secundario">Consultar</button></form>;
  return <div className="archivo-eira hoja">
    {q.imprimir==='1' && <ImprimirAlAbrir/>}
    <div className="utiles no-imprimir"><Link href={`/reportes?${url}`}>Todos los reportes</Link>{form}<a className="btn btn--primario" href={`/reportes/${tipo}/informe.pdf?${url}`}>Descargar PDF</a><a className="btn btn--secundario" href={`/reportes/${tipo}/datos.csv?${url}`}>Descargar CSV</a><BotonImprimir/></div>
    <section className="pliego">
      <header className="membrete"><strong>EIRA</strong><span>Movimiento Rosa A.C.</span><span>Datos de demostración · Folio {r.version}</span></header>
      <div className="titulo-ficha"><div><h1>{territorio?'Presencia territorial':'Impacto para aliados'}</h1><p>{territorio ? `Para gobierno y hospitales de ${localidad ? localidad.municipio : 'los municipios con actividad'}.` : 'Para las organizaciones que acompañan el trabajo de EIRA.'}</p></div>
      <dl><dt>Programa</dt><dd>{nombre}</dd><dt>Corte de las fuentes</dt><dd>{corte}</dd></dl></div>
      <p className="seleccion-publicada">Selección: {nombre}. {periodo}. {f.estado.length>0 && `Entidades: ${f.estado.join(', ')}. `}{f.municipio.length>0 && `Municipios: ${f.municipio.join(', ')}. `}{f.servicio.join(', ')}</p>
      {territorio && <form className="lector-filtros no-imprimir">{ocultos(['mun','mapa'])}<label>Municipio destinatario<select name="mun" defaultValue={q.mun||''}><option value="">Todos los municipios</option>{r.municipios.map(m=><option key={m.clave} value={m.clave}>{m.municipio} ({m.estado})</option>)}</select></label><label>Mapa<select name="mapa" defaultValue={nacional?'mexico':'jalisco'}><option value="jalisco">Jalisco por municipio</option><option value="mexico">México por estado</option></select></label><button className="btn btn--secundario">Ver ficha</button></form>}
      {!r.fuentes.length ? <p className="sin-lectura">{r.disponible?'Sin actividad registrada para esta selección.':'El detalle del motor no está disponible para este cruce. No se muestran cifras globales en su lugar.'}</p> : territorio ? <div className="panel-mapa">
        <div><h2>{localidad?.municipio || (nacional?'México':'Jalisco')}</h2><p>{localidad ? `${cifra(localidad.n)} registros con clave municipal verificada.` : `${new Set(municipios.filter(m=>nacional || m.estado_clave==='14').map(m=>m.clave)).size} municipios con actividad en el mapa.`}</p><p>Los símbolos representan registros, no personas ni tasas.</p></div><AtlasReporte municipios={municipios} nacional={nacional}/></div> :
        <div className="resumen-bento"><div className="respuesta"><span><UsersRound/> Personas impactadas <a href="#metodo" aria-label="Ver método de conteo"><ArrowUpRight/></a></span><strong>{cifra(r.impactadas)}</strong>
        <p>{programa==='global'?'Suma de personas identificadas por programa.':'Personas identificadas en el programa.'}</p><small>Sin periodo previo</small></div>
        {([[HeartPulse,'Donantes',cifra(r.donantes),'Se cuentan por separado'],[MapPin,'Municipios',r.municipios.length,'Con actividad verificada'],[CalendarDays,'Mediana de edad',r.edad.mediana??'—','Años al corte']] as const).map(([Icono,titulo,n,detalle])=><div className="dato-bento" key={titulo}><span><Icono/>{titulo}<a href="#metodo" aria-label={`Método: ${titulo}`}><ArrowUpRight/></a></span><strong>{n}</strong><p>{detalle}</p><small>Sin periodo previo</small></div>)}</div>}
      {!territorio && r.disponible && <div className="columnas"><section><h2>Alcance por servicio</h2><p>Actividad registrada por unidad; una persona puede recibir más de un servicio.</p><Barras items={servicios.map(s=>({label:`${s.label} (${pluralTipo(s.unidad)})`,n:s.n}))}/></section>
        <section><h2>Edad al corte</h2><p>{r.edad.mediana!==null ? `Mediana: ${r.edad.mediana} años. Promedio: ${r.edad.media?.toLocaleString('es-MX',{maximumFractionDigits:1})} años.`:'Sin muestra publicable.'} Con edad: {cifra(r.edad.n)}. Sin edad: {cifra(r.edad.sin)}{r.edad.total>=5 && (r.edad.sin===0 || r.edad.sin>=5) ? ` (${Math.round(r.edad.sin*100/r.edad.total)} %)` : ''}.</p><Barras items={r.edad.grupos}/></section></div>}
      {territorio ? <section className="nota-norma norma-bento"><AnilloDato valor={null} etiqueta="Sin meta municipal convenida"/><div><h2>Contribución a la población objetivo</h2><p>Citología: 25 a 64 años. Exploración clínica de mama: desde los 25 años. El ultrasonido no equivale a una mastografía.</p>
        {r.tasas.map(t=><p key={t.clave}><b>{t.municipio}:</b> {cifra(t.n)} atenciones de Papanicolaou en el grupo de edad; {t.tasa===null?'tasa reservada':`${t.tasa.toLocaleString('es-MX',{maximumFractionDigits:2})} por 1,000 mujeres de 25 a 64 años`}.</p>)}
        <p className="sin-dato">{pendiente}: avance frente a meta municipal. El cociente de actividad usa el municipio registrado y el sexo supuesto por servicio; no mide mujeres únicas ni acredita residencia.</p></div></section> :
        <section className="nota-norma"><h2>Continuidad y aporte</h2><p className="sin-dato">{pendiente}: convocadas, resultados anormales, seguimiento de referencias, costo por estudio, avance contra meta y comparación con el periodo previo. No se atribuyen resultados clínicos al conteo de actividades.</p></section>}
    </section>
    <section className="pliego evidencia"><h2>Evidencia del corte</h2>
      {territorio && <><h3>Clave y población de referencia</h3><div className="tabla-scroll" role="region" aria-label="Presencia por municipio" tabIndex={0}>
      <table><thead><tr><th>Clave INEGI</th><th>Municipio</th><th>Registros</th><th>Mujeres 25–64, 2020</th></tr></thead><tbody>{municipios.map(m=><tr key={m.clave}><td>{m.clave}</td><th scope="row">{m.municipio}</th><td>{cifra(m.n)}</td><td>{m.poblacion?.toLocaleString('es-MX')||'Sin dato'}</td></tr>)}</tbody></table></div></>}
      <h3>Actividad por servicio y lugar</h3><p>Cuando falta el cruce oficial, se conserva la ciudad de origen sin asignarle una clave.</p>
      <div className="tabla-scroll" role="region" aria-label="Actividad desglosada" tabIndex={0}><table><thead><tr><th>Lugar registrado</th><th>Programa</th><th>Servicio</th><th>Unidad</th><th>Cantidad</th></tr></thead><tbody>{lineas.map((l,i)=><tr key={i}><th scope="row">{l.municipio}</th><td>{nombrePrograma(l.programa)}</td><td>{l.servicio}</td><td>{pluralTipo(l.unidad)}</td><td>{cifra(l.n)}</td></tr>)}</tbody></table></div>
      {!lineas.length && <p>No hay desglose verificable para esta selección.</p>}
    </section>
    <section id="metodo" className="pliego ficha-metodo"><h2><BadgeCheck aria-hidden/> Ficha técnica</h2><dl><dt>Folio de fuentes</dt><dd>{folio}</dd>
      <dt>Fecha y periodicidad</dt><dd>{corte}. {periodo}. Meses con actividad: {r.periodos.join(', ') || 'sin datos'}. {r.jornadas!==null ? `${r.jornadas} jornadas con fecha y municipio distintos.` : 'Sin desglose diario.'}</dd>
      <dt>Fuentes y versiones</dt><dd>{r.fuentes.map(f=><div key={f.id}>{f.nombre} ({f.id}), corte {fechaEs(f.fecha_corte)}</div>)}</dd>
      <dt>Método</dt><dd>Conteos directos del motor por programa, servicio y unidad. Personas según el rol seudonimizado; los pares pendientes comparten representante. {cifra(excluidas)} filas omitidas según las fuentes. Celdas de 1 a 4: &lt;5.</dd>
      <dt>Denominador</dt><dd><a href="https://www.inegi.org.mx/programas/ccpv/2020/">INEGI, Censo 2020, ITER Jalisco</a>: población femenina de 25 a 64 años, no una meta convenida. Tasa propuesta: estudios elegibles entre población objetivo por 1,000. Sin numerador validado no hay tasa.</dd>
      <dt>Límites</dt><dd>Sin resultados clínicos ni metas municipales. El indicador de actividad usa edad en la fecha del evento. No acredita residencia, seguimiento hospitalario ni eficacia.</dd></dl>
      <p>Cifras de EIRA Movimiento Rosa A.C.; no sustituyen las estadísticas oficiales de SICAM/DGIS. Las unidades no son sumables.</p></section>
  </div>;
}
