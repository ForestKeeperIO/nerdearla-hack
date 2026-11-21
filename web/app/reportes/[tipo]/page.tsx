import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotonImprimir } from '@/components/imprimir';
import { AtlasReporte } from '@/components/atlas-reporte';
import { informesActivos, nombrePrograma, pluralTipo } from '@/lib/catalogo';
import { esAlcance } from '@/lib/informe';
import { fechaEs } from '@/lib/comun';
import { cifraPublica as cifra, esReporte, leerReporte, porServicio } from '@/lib/reportes';
import './hoja.css';

export const dynamic = 'force-dynamic';
const pendiente = 'En construcción';

function Barras({ items }: {items: {label:string;n:number}[]}) {
  const max = Math.max(1,...items.map(s=>s.n));
  return <ul className="rayas">{items.map(s=><li key={s.label}><span>{s.label}</span><b>{cifra(s.n)}</b><i aria-hidden="true" style={{width:s.n>=5?`${100*s.n/max}%`:'0%'}}/></li>)}</ul>;
}

export default async function ReportePagina({params, searchParams}: {params:Promise<{tipo:string}>;searchParams:Promise<{programa?:string;mun?:string;mapa?:string}>}) {
  const {tipo} = await params, q = await searchParams;
  const programa = q.programa || 'tamizaje-rosa';
  if (!esReporte(tipo) || !esAlcance(programa)) notFound();
  const r = await leerReporte(programa), territorio = tipo==='territorial';
  const localidad = q.mun && territorio ? r.municipios.find(m=>m.clave===q.mun) : undefined;
  if (territorio && q.mun && !localidad) notFound();
  const municipios = localidad ? [localidad] : r.municipios;
  const lineas = localidad ? r.lineas.filter(l=>l.cve===localidad.clave) : r.lineas;
  const servicios = porServicio(lineas);
  const url = new URLSearchParams({programa,...(localidad?{mun:localidad.clave}:{})});
  const folio = `EIRA-${territorio?'T':'A'}-${programa}-${localidad?.clave||'general'}-${r.version}`;
  const nombre = programa==='global' ? 'Global' : nombrePrograma(programa);
  const corte = r.corte ? fechaEs(r.corte) : 'Sin fecha de corte';
  const nacional = q.mapa==='mexico' || (!!localidad && localidad.estado_clave!=='14');
  const excluidas = r.fuentes.reduce((a,f)=>a+f.filas_omitidas,0);
  const form = <form className="lector-filtros no-imprimir">
    <label>Programa<select name="programa" defaultValue={programa}>{[...informesActivos().map(p=>[p.id,p.nombre]),['global','Global']].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
    <button className="btn btn--secundario">Consultar</button></form>;
  return <div className="archivo-eira hoja">
    <div className="utiles no-imprimir"><Link href="/reportes">Todos los reportes</Link>{form}<a className="btn btn--secundario" href={`/reportes/${tipo}/datos.csv?${url}`}>Descargar CSV</a><BotonImprimir/></div>
    <section className="pliego">
      <header className="membrete"><strong>EIRA</strong><span>Movimiento Rosa A.C.</span><span>Datos de demostración</span></header>
      <div className="titulo-ficha"><div><h1>{territorio?'Presencia territorial':'Impacto para aliados'}</h1><p>{territorio ? `Para gobierno y hospitales de ${localidad ? localidad.municipio : 'los municipios con actividad'}.` : 'Para las organizaciones que acompañan el trabajo de EIRA.'}</p></div>
      <dl><dt>Programa</dt><dd>{nombre}</dd><dt>Corte de las fuentes</dt><dd>{corte}</dd></dl></div>
      {territorio && <form className="lector-filtros no-imprimir"><input type="hidden" name="programa" value={programa}/><label>Municipio destinatario<select name="mun" defaultValue={localidad?.clave||''}><option value="">Todos los municipios</option>{r.municipios.map(m=><option key={m.clave} value={m.clave}>{m.municipio} ({m.estado})</option>)}</select></label><label>Mapa<select name="mapa" defaultValue={nacional?'mexico':'jalisco'}><option value="jalisco">Jalisco por municipio</option><option value="mexico">México por estado</option></select></label><button className="btn btn--secundario">Ver ficha</button></form>}
      {!r.fuentes.length ? <p className="sin-lectura">No hay fuentes procesadas para este programa. No se emiten cifras.</p> : territorio ? <div className="panel-mapa">
        <div><h2>{localidad?.municipio || (nacional?'México':'Jalisco')}</h2><p>{localidad ? `${cifra(localidad.n)} registros con clave municipal verificada.` : `${new Set(municipios.filter(m=>nacional || m.estado_clave==='14').map(m=>m.clave)).size} municipios con actividad en el mapa.`}</p><p>Los símbolos representan registros, no personas ni tasas.</p></div><AtlasReporte municipios={municipios} nacional={nacional}/></div> :
        <div className="respuesta"><div><strong>{cifra(r.impactadas)}</strong><span>personas impactadas identificadas</span></div>
        <p>{programa==='global'?'Suma por programa: quien recibió atención en dos programas cuenta en ambos.':'Cada persona que recibió atención o participó en el programa cuenta una vez.'} Donantes identificadas: <b>{cifra(r.donantes)}</b>, por separado.</p></div>}
      {!territorio && <div className="columnas"><section><h2>Alcance por servicio</h2><p>Productos de la actividad, según B4SI.</p><Barras items={servicios.map(s=>({label:`${s.label} (${pluralTipo(s.unidad)})`,n:s.n}))}/></section>
        <section><h2>Edad al corte</h2><p>{r.edad.mediana!==null ? `Mediana: ${r.edad.mediana} años. Promedio: ${r.edad.media?.toLocaleString('es-MX',{maximumFractionDigits:1})} años.`:'Sin muestra publicable.'} Con edad: {cifra(r.edad.n)}. Sin edad: {cifra(r.edad.sin)}{r.edad.total>=5 && (r.edad.sin===0 || r.edad.sin>=5) ? ` (${Math.round(r.edad.sin*100/r.edad.total)} %)` : ''}.</p><Barras items={r.edad.grupos}/></section></div>}
      {territorio ? <section className="nota-norma"><h2>Contribución a la población objetivo</h2><p>Citología: mujeres de 25 a 64 años. Exploración clínica de mama: desde los 25 años. El ultrasonido no equivale a una mastografía.</p><p className="sin-dato">{pendiente}: tasa por 1,000 y avance hacia la meta municipal. Falta el cruce de residencia, edad al evento y estudio; los registros totales no son el numerador.</p></section> :
        <section className="nota-norma"><h2>Continuidad y aporte</h2><p className="sin-dato">{pendiente}: convocadas, resultados anormales, seguimiento de referencias, costo por estudio, avance contra meta y comparación con el periodo previo. No se atribuyen resultados clínicos al conteo de actividades.</p></section>}
    </section>
    <section className="pliego evidencia"><h2>Evidencia del corte</h2>
      {territorio && <><h3>Clave y población de referencia</h3><div className="tabla-scroll" role="region" aria-label="Presencia por municipio" tabIndex={0}>
      <table><thead><tr><th>Clave INEGI</th><th>Municipio</th><th>Registros</th><th>Mujeres 25–64, 2020</th></tr></thead><tbody>{municipios.map(m=><tr key={m.clave}><td>{m.clave}</td><th scope="row">{m.municipio}</th><td>{cifra(m.n)}</td><td>{m.poblacion?.toLocaleString('es-MX')||'Sin dato'}</td></tr>)}</tbody></table></div></>}
      <h3>Actividad por servicio y lugar</h3><p>Cuando falta el cruce oficial, se conserva la ciudad de origen sin asignarle una clave.</p>
      <div className="tabla-scroll" role="region" aria-label="Actividad desglosada" tabIndex={0}><table><thead><tr><th>Lugar registrado</th><th>Programa</th><th>Servicio</th><th>Unidad</th><th>Cantidad</th></tr></thead><tbody>{lineas.map((l,i)=><tr key={i}><th scope="row">{l.municipio}</th><td>{nombrePrograma(l.programa)}</td><td>{l.servicio}</td><td>{pluralTipo(l.unidad)}</td><td>{cifra(l.n)}</td></tr>)}</tbody></table></div>
      {!lineas.length && <p>No hay desglose verificable para esta selección.</p>}
    </section>
    <section className="pliego ficha-metodo"><h2>Ficha técnica</h2><dl><dt>Folio de fuentes</dt><dd>{folio}</dd>
      <dt>Fecha y periodicidad</dt><dd>{corte}. Acumulado de archivos cargados; se actualiza con cada procesamiento. Meses con actividad: {r.periodos.join(', ') || 'sin datos'}. No equivalen a jornadas.</dd>
      <dt>Fuentes y versiones</dt><dd>{r.fuentes.map(f=><div key={f.id}>{f.nombre} ({f.id}), corte {fechaEs(f.fecha_corte)}</div>)}</dd>
      <dt>Método</dt><dd>Conteos directos del motor por programa, servicio y unidad. Personas según el rol seudonimizado; los pares pendientes comparten representante. {cifra(excluidas)} filas omitidas según las fuentes. Celdas de 1 a 4: &lt;5.</dd>
      <dt>Denominador</dt><dd><a href="https://www.inegi.org.mx/programas/ccpv/2020/">INEGI, Censo 2020, ITER Jalisco</a>: población femenina de 25 a 64 años, no una meta convenida. Tasa propuesta: estudios elegibles entre población objetivo por 1,000. Sin numerador validado no hay tasa.</dd>
      <dt>Límites</dt><dd>Sin día de jornada ni edad por estudio en los conteos publicados. No se infiere sexo, residencia, seguimiento hospitalario ni eficacia a partir del servicio.</dd></dl>
      <p>Cifras de EIRA Movimiento Rosa A.C.; no sustituyen las estadísticas oficiales de SICAM/DGIS. Las unidades no son sumables.</p></section>
  </div>;
}
