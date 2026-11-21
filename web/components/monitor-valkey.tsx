'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Monitor } from '@/lib/monitor-valkey';

const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const reloj = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', timeStyle: 'medium', hourCycle: 'h23' });
const num = (v: number | null) => v === null ? '—' : nf.format(v);
const mib = (v: number | null) => v === null ? '—' : `${num(v / 1048576)} MiB`;
function duracion(s: number | null) {
  if (s === null) return '—';
  if (s < 60) return `${num(Math.floor(s))} s`;
  if (s < 3600) return `${num(Math.floor(s/60))} min`;
  return `${num(Math.floor(s/3600))} h ${num(Math.floor(s/60)%60)} min`;
}

function Tarjeta({ titulo, comandos, clase = '', children }: {
  titulo: string; comandos: string[]; clase?: string; children: ReactNode;
}) {
  return <section className={`vk-panel ${clase}`}>
    <h2>{titulo}</h2>{children}
    <footer className="vk-comando"><span>Comando</span>{comandos.map(c => <code key={c}>{c}</code>)}</footer>
  </section>;
}

function Curva({ puntos }: { puntos: number[] }) {
  if (!puntos.length) return <p>Sin muestra de actividad.</p>;
  const max = Math.max(1, ...puntos);
  const coords = puntos.map((v,i) => [414 - (puntos.length-1-i) * 408/59, 75 - 66*v/max]);
  const [x,y] = coords[coords.length-1];
  return <figure className="vk-curva">
    <svg viewBox="0 0 420 84" preserveAspectRatio="none" role="img"
      aria-label={`Operaciones por segundo: ${puntos.length} muestras; mínimo ${num(Math.min(...puntos))}, máximo ${num(Math.max(...puntos))}.`}>
      <path d="M0 10H420 M0 43H420 M0 76H420" className="vk-guia"/>
      <polyline points={coords.map(c=>c.join(',')).join(' ')} /><circle cx={x} cy={y} r="3.5"/>
    </svg>
    <figcaption><span>{puntos.length} de 60 muestras</span><span>Ahora</span></figcaption>
  </figure>;
}

function Stream({ s }: { s: Monitor['streams'][number] }) {
  const { clave, grupo } = s;
  return <Tarjeta titulo={clave} clase="vk-mitad vk-stream" comandos={[
    `XINFO STREAM ${clave}`, `XINFO GROUPS ${clave}`,
    ...(grupo ? [`XINFO CONSUMERS ${clave} procesadores`] : []), `XREVRANGE ${clave} + - COUNT 5`,
  ]}>
    <p className="vk-nota">{clave === 'eira:trabajos' ? 'Cola de archivos enviados al procesador.' : 'Resoluciones enviadas al procesador.'}</p>
    {s.longitud === null ? <p>El stream aún no existe.</p> : <>
      <dl className="vk-fila">
        <div><dt>Entradas</dt><dd>{num(s.longitud)}</dd></div>
        <div><dt>Sin confirmar</dt><dd>{num(grupo?.pendientes ?? null)}</dd></div>
        <div><dt>Por entregar</dt><dd>{num(grupo?.retraso ?? null)}</dd></div>
      </dl>
      <h3>Grupo: <code>procesadores</code></h3>
      {!grupo ? <p>El grupo aún no existe.</p> : !grupo.lectores.length ? <p>Sin consumidores registrados.</p> :
        <ul className="vk-lista">{grupo.lectores.map((c,i)=><li key={i}>Consumidor {i+1}
          <span>{duracion(c.idle === null ? null : c.idle/1000)} inactivo · {num(c.pendientes)} pendientes</span></li>)}</ul>}
      <h3>Últimas cinco entradas</h3>
      {!s.entradas.length ? <p>Todavía no hay entradas.</p> : <ol className="vk-entradas">
        {s.entradas.map((campos,i)=><li key={i}>{campos.length ? campos.map(({campo,valor}) => valor ? `${campo}: ${valor}` : campo).join(' · ') : 'Sin campos públicos'}</li>)}
      </ol>}
    </>}
  </Tarjeta>;
}

export function MonitorVivo({ inicial }: { inicial: Monitor | null }) {
  const [d, datos] = useState(inicial);
  const [puntos, serie] = useState<number[]>(inicial?.ops != null ? [inicial.ops] : []);
  const [fallo, error] = useState(!inicial);
  const [pausa, pausar] = useState(false);
  useEffect(() => {
    if (pausa) return;
    const abort = new AbortController();
    let ocupado = false;
    let anterior = inicial?.leido;
    const leer = async () => {
      if (ocupado || document.hidden) return;
      ocupado = true;
      try {
        const r = await fetch('/api/valkey', { cache: 'no-store', signal: abort.signal });
        if (!r.ok) throw new Error();
        const m: Monitor = await r.json();
        if (abort.signal.aborted) return;
        datos(m); error(false);
        if (m.leido !== anterior && m.ops !== null) {
          const v = m.ops;
          serie(p => [...p.slice(-59), v]);
        }
        anterior = m.leido;
      } catch { if (!abort.signal.aborted) error(true); }
      finally { ocupado = false; }
    };
    void leer();
    const id = window.setInterval(leer, 2000);
    document.addEventListener('visibilitychange', leer);
    return () => { clearInterval(id); abort.abort(); document.removeEventListener('visibilitychange', leer); };
  }, [pausa, inicial]);
  const ratio = d && d.aciertos !== null && d.fallos !== null && d.aciertos+d.fallos > 0
    ? `${num(100*d.aciertos/(d.aciertos+d.fallos))} %` : '—';
  return <article className="archivo-eira vk">
    <header className="vk-titulo"><div><h1>Monitor de Valkey</h1>
      <p>Actividad del servidor y colas de procesamiento de EIRA, en modo de solo lectura.</p></div>
      <div className="vk-control"><button type="button" onClick={()=>pausar(!pausa)}>{pausa ? 'Reanudar' : 'Pausar'}</button>
        <span>{pausa ? 'Lectura en pausa' : 'Cada 2 s'}{d && <> · <time dateTime={d.leido}>{reloj.format(new Date(d.leido))} CDMX</time></>}</span></div>
    </header>
    <p role="status" className="vk-error">{fallo ? `Valkey no respondió.${d ? ' Se conserva la última lectura.' : ''}${pausa ? '' : ' Se reintentará automáticamente.'}` : ''}</p>
    {d && <div className="vk-grid">
      <Tarjeta titulo="Actividad del servidor" clase="vk-actividad" comandos={['INFO stats']}>
        <div className="vk-pulso"><div><strong className="vk-numero">{num(d.ops)}</strong><span>operaciones por segundo</span></div><Curva puntos={puntos}/></div>
        <p className="vk-nota">Incluye las consultas de este monitor y de las demás bases.</p>
      </Tarjeta>
      <Tarjeta titulo={`Valkey ${d.version ?? '· versión no disponible'}`} clase="vk-servidor" comandos={['INFO server','INFO persistence']}>
        <dl className="vk-datos"><div><dt>Modo</dt><dd>{d.modo === 'standalone' ? 'Independiente' : (d.modo ?? '—')}</dd></div>
          <div><dt>Tiempo activo</dt><dd>{duracion(d.uptime)}</dd></div>
          <div><dt>Registro AOF</dt><dd>{d.aof === null ? '—' : d.aof ? 'Activo' : 'Inactivo'}</dd></div>
          <div><dt>Copias RDB</dt><dd>{num(d.guardados)} · último guardado: {d.rdb === 'ok' ? 'correcto' : d.rdb === 'err' ? 'error' : '—'}</dd></div></dl>
      </Tarjeta>
      <Tarjeta titulo="Clientes conectados" comandos={['INFO clients']}><strong className="vk-valor">{num(d.clientes)}</strong><p>Conexiones al servidor.</p></Tarjeta>
      <Tarjeta titulo="Memoria en uso" comandos={['INFO memory']}><strong className="vk-valor">{mib(d.memoria)}</strong><p>Pico: {mib(d.pico)}</p></Tarjeta>
      <Tarjeta titulo="Lecturas con acierto" comandos={['INFO stats']}><strong className="vk-valor">{ratio}</strong><p>{num(d.aciertos)} aciertos / {num(d.fallos)} fallos</p></Tarjeta>
      <Tarjeta titulo={`Base ${d.db}`} comandos={['DBSIZE','INFO keyspace']}><strong className="vk-valor">{num(d.claves)} claves</strong><p>{num(d.caducan)} con caducidad{d.caducan > 0 ? ` · TTL medio: ${num(d.ttl)} ms` : ''}</p></Tarjeta>
      <div className="vk-seccion"><h2>Streams de EIRA</h2><p>Se muestran campos de esquema y valores públicos, nunca los identificadores de entradas o personas.</p></div>
      {d.streams.map(s=><Stream key={s.clave} s={s}/>)}
      <Tarjeta titulo="Mapa de claves" clase="vk-mapa" comandos={['set','hash','stream','string','list','zset'].map(t=>`SCAN 0 MATCH eira:* COUNT 256 TYPE ${t}`)}>
        <p className="vk-nota">Claves por familia y tipo. El cursor recorre la base sin abrir los valores.</p>
        <div className="vk-tabla" role="region" aria-label="Mapa de claves por prefijo" tabIndex={0}><table>
          <thead><tr><th scope="col">Prefijo</th><th scope="col">Tipo</th><th scope="col">Claves</th></tr></thead>
          <tbody>{d.filas.map(f=><tr key={f.tipo+f.prefijo}><th scope="row"><code>{f.prefijo}</code></th><td>{f.tipo}</td><td>{num(f.cantidad)}</td></tr>)}</tbody>
        </table>{!d.filas.length && <p>No hay claves de EIRA en esta base.</p>}</div>
      </Tarjeta>
      <div className="vk-lateral">
        <Tarjeta titulo="Personas en conjuntos" comandos={['SCARD eira:per:todas']}><strong className="vk-valor">{num(d.personas)}</strong>
          <p>Identificadores únicos en el conjunto general. Los subconjuntos pueden coincidir y no se suman.</p>
          {d.tamanos.length > 0 && <details><summary>Ver {d.tamanos.length} subconjuntos</summary>
            <ul className="vk-lista">{d.tamanos.map((s,i)=><li key={i}><code>eira:per:{s.dimension}:*</code><strong>{num(s.cantidad)}</strong></li>)}</ul></details>}
        </Tarjeta>
        <Tarjeta titulo="Pares registrados" comandos={['HLEN eira:pares']}><strong className="vk-valor">{num(d.pares)}</strong><p>Campos en el hash de revisión, sin leer sus valores.</p></Tarjeta>
        <Tarjeta titulo="Canal de eventos" comandos={['PUBSUB NUMSUB eira:eventos']}><strong className="vk-valor">{num(d.suscriptores)}</strong><p>Suscriptores directos a <code>eira:eventos</code>.</p></Tarjeta>
      </div>
    </div>}
  </article>;
}
