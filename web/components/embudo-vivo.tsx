'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, Database, FileSpreadsheet, GitPullRequest, ShieldCheck, Workflow } from 'lucide-react';
import type { Observatorio } from '@/lib/observatorio';
import { StarRating } from '@/components/ui/star-rating';
import { ParesBento } from '@/components/bento-calidad';
import { DiagramaMotor } from './diagrama-motor';

const numero = (n: number | null) => n === null ? '—' : n.toLocaleString('es-MX');
const momento = (s: string) => new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
}).format(new Date(s));

function Cinta({ valores }: { valores: number[] | null }) {
  if (!valores || !valores[0]) return <div className="cf-cinta-vacia" aria-hidden/>;
  const alturas = valores.map(v => 68 * v / valores[0]);
  return <svg viewBox="0 0 400 72" preserveAspectRatio="none" aria-hidden className="cf-cinta">
    {alturas.map((h,i) => {
      const previo = alturas[Math.max(0,i-1)], x = 100*i;
      return <path key={i} d={`M${x} ${36-previo/2} C${x+44} ${36-previo/2} ${x+56} ${36-h/2} ${x+100} ${36-h/2}
        V${36+h/2} C${x+56} ${36+h/2} ${x+44} ${36+previo/2} ${x} ${36+previo/2}Z`}
        fill={['var(--vino-oscuro)','var(--vino)','var(--ciruela)','var(--tinta-suave)'][i]}/>;
    })}
  </svg>;
}

function Embudo({ d }: { d: Observatorio }) {
  const { recibidas: r, descartadas: a, previas: b, internas: c } = d;
  const cinta = r !== null && a !== null && b !== null && c !== null && r-a-b-c === d.aceptadas
    ? [r, r-a, r-a-b, r-a-b-c] : null;
  const etapas = [
    [r, 'Filas recibidas', d.sinLectura ? `${d.sinLectura} cargas sin recuento.` : 'Incluye todos los reenvíos.'],
    [d.rechazados, 'Archivos rechazados', `${numero(a)} filas. Mismos bytes o contenido, incluso en otro formato.`],
    [b, 'Filas ya cargadas', 'Estaban en otra fuente. Solo pasan las nuevas.'],
    [c, 'Filas repetidas', 'Aparecen más de una vez en el mismo archivo.'],
  ] as const;
  return <section className="cf-tarjeta cf-embudo">
    <div className="cf-cabecera"><h2><Workflow aria-hidden/>Embudo de deduplicación</h2><span className="cf-pildora">Todos los programas</span></div>
    <div className="cf-recorrido">
      <div className="cf-filas">
        <h3>Archivos y filas</h3><Cinta valores={cinta}/>
        <ol>{etapas.map(([n, titulo, nota]) => <li key={titulo}>
          <strong>{numero(n)}</strong><b>{titulo}</b><small>{nota}</small>
        </li>)}</ol>
        <p className="cf-pie">{cinta ? <><b>{numero(cinta[3])} filas</b> pasan la deduplicación.</> : 'Sin volumen completo para dibujar el flujo.'} El grosor representa filas, no personas.</p>
      </div>
      <div className="cf-personas"><h3>Identidades y revisión</h3>
        <div className="cf-hitos">
          <div><span className="cf-nodo" aria-hidden/><strong>{numero(d.coincidentes)}</strong><b>En varios programas</b><small>Identidades que coinciden en dos o más programas.</small></div>
          <div><span className="cf-nodo cf-pendiente" aria-hidden/><strong>{numero(d.pendientes + d.decididos)}</strong><b>Pares a revisión</b><small>{numero(d.pendientes)} pendientes · {numero(d.decididos)} decididos.</small></div>
        </div>
        <p className="cf-pie">El motor une ID y nombre coincidentes. No publica un total separado de uniones automáticas.</p>
      </div>
      <div className="cf-resultado">
        <div><b>Personas únicas</b><Link className="cf-enlace-redondo" href="/tablero" aria-label="Ver el tablero de impacto"><ArrowUpRight aria-hidden/></Link></div>
        <strong>{numero(d.unicas)}</strong><p>Incluye donantes. Cada identidad cuenta una vez en todo el índice.</p>
      </div>
    </div>
  </section>;
}

function Cargas({ d }: { d: Observatorio }) {
  return <section className="cf-tarjeta cf-cargas"><div className="cf-cabecera"><h2 id="cf-cargas"><FileSpreadsheet aria-hidden/>Últimas cargas</h2>
    <Link className="cf-enlace-redondo" href="/subir" aria-label="Ir a Subir archivos"><ArrowUpRight aria-hidden/></Link></div>
    {d.cargas.length ? <div className="cf-tabla" tabIndex={0} role="region" aria-labelledby="cf-cargas">
      <table><thead><tr><th scope="col">Archivo</th><th scope="col">Veredicto</th><th scope="col">Calidad</th></tr></thead>
        <tbody>{d.cargas.map(c => <tr key={c.sid}><th scope="row">{c.nombre}</th><td><span className="cf-pildora">{c.veredicto}</span></td>
          <td>{c.estrellas === null ? 'Sin calificar' : <StarRating valor={c.estrellas}/>}
            {c.original && <small>De la fuente original</small>}</td></tr>)}</tbody>
      </table></div> : <p>Aún no se han recibido archivos.</p>}
    <p className="cf-pie">Hasta cinco cargas, de la más reciente a la más antigua. Un duplicado no recibe una calificación nueva.</p>
  </section>;
}

function Infraestructura({ d }: { d: Observatorio }) {
  return <><section className="cf-tarjeta cf-arquitectura">
    <h2><Workflow aria-hidden/>Arquitectura en vivo</h2><DiagramaMotor/>
    <div className="cf-privacidad"><ShieldCheck aria-hidden/><div>
      <strong>{d.identidadVerificada ? 'Índice de personas seudonimizado: sin nombres ni ID en claro.' : 'Índice de personas: sin verificación completa.'}</strong>
      <p>Se comprueban los identificadores y las etiquetas de revisión. El Excel original sí puede contener nombres: {numero(d.archivosTemporales)} archivos temporales ahora.</p>
    </div></div>
  </section>
  <section className="cf-tarjeta cf-valkey"><div className="cf-cabecera"><h2><Database aria-hidden/>Valkey</h2><span className="cf-pildora">{numero(d.claves)} claves eira:*</span></div>
    <dl>{d.streams.map(s => <div key={s.clave}><dt>{s.clave}</dt><dd><b>{numero(s.mensajes)}</b> mensajes</dd>
      <dd className="cf-grupos">{s.grupos.length ? s.grupos.map(g => <span key={g.nombre}>Grupo {g.nombre}: {numero(g.pendientes)} sin confirmar</span>) : 'Sin grupo de consumidores'}</dd></div>)}</dl>
    <p><b>Último evento en bitácora</b><br/>{d.ultimoEvento ? <time dateTime={d.ultimoEvento}>{momento(d.ultimoEvento)} CDMX</time> : 'Sin eventos registrados'}</p>
    <p><b>Canal eira:eventos</b><br/>{d.canal.ultima ? `Última señal: ${momento(d.canal.ultima)} CDMX` : d.canal.lista ? 'En escucha, sin señal observada' : 'Conectando a la escucha'}. Sin historial; canal compartido entre bases.</p>
  </section></>;
}

export function EmbudoVivo({ inicial }: { inicial: Observatorio | null }) {
  const [d, setDatos] = useState(inicial);
  const [fallo, setFallo] = useState(!inicial);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function actualizar() {
      try {
        const res = await fetch('/api/como-funciona', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error();
        const nuevo: Observatorio = await res.json();
        setDatos(nuevo); setFallo(false);
      } catch { if (!controller.signal.aborted) setFallo(true); }
      if (!controller.signal.aborted) timer = setTimeout(actualizar, 10000);
    }
    void actualizar();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return <>
    <div className="cf-titulo"><h1>Cómo funciona</h1><span><Activity aria-hidden/>{fallo ? 'Lectura interrumpida' : 'Lectura en vivo'}{d && <> · <time dateTime={d.leidoEn}>{momento(d.leidoEn)} CDMX</time></>}</span></div>
    <div className="cf-intro"><p><b>El problema</b> Cada programa trae su Excel. Al juntarlos a mano, una persona puede contarse dos veces.</p>
      <p><b>La solución</b> La plataforma deduplica en tres capas: archivo, fila y persona.</p></div>
    {fallo && <p className="cf-alerta" role="status">{d ? 'Se muestran los últimos datos leídos.' : 'Valkey no respondió; no hay cifras verificadas.'} Se reintentará la lectura.</p>}
    {d && <div className="cf-rejilla"><Embudo d={d}/><Cargas d={d}/>
      <div className="cf-revision"><ParesBento pendientes={d.pendientes} decididos={d.decididos}/>
        <p><GitPullRequest aria-hidden/>Un mismo ID con nombres distintos requiere una decisión humana. Mientras se revisa, el par cuenta como una persona.</p></div>
      <Infraestructura d={d}/>
      {d.sinId > 0 && <p className="cf-nota">Sin ID no se suma una persona. Hay actividad sin identificar en {numero(d.sinId)} combinaciones de programa, ciudad, mes y servicio.</p>}
    </div>}
  </>;
}
