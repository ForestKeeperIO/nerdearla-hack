import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, CalendarDays, CircleHelp, HeartPulse, MapPin, UsersRound } from 'lucide-react';
import { AccionesTablero } from '@/components/acciones-tablero';
import { FiltrosAtlas } from '@/components/filtros-atlas';
import { AtlasTerritorial } from '@/components/atlas-territorial';
import { Distribucion } from '@/components/desgloses-atlas';
import { CargasBento, ParesBento, ServiciosBento } from '@/components/bento-calidad';
import { MesesBento } from '@/components/bento-meses';
import { TableroVivo } from '@/components/tablero-vivo';
import { fechaEs } from '@/lib/comun';
import { periodoTexto, seleccionDe } from '@/lib/seleccion-tablero';
import { impactoPublico } from '@/lib/metabase';
import { leerTablero } from '@/lib/tablero-impacto';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tablero de impacto · EIRA' };

function Cifra({ titulo, valor, unidad, corte, regla, id, previo, referencia }: {
  titulo: string; valor: number | null; unidad: string; corte: string; regla: string; id: string;
  previo: number | null | undefined; referencia: string;
}) {
  const delta = previo == null || valor == null ? null : Math.round((valor-previo)*10)/10;
  const Cambio = delta===0 ? ArrowRight : delta!==null && delta<0 ? ArrowDown : ArrowUp;
  const Icono = id==='personas' ? UsersRound : id==='edad' ? CalendarDays : id==='municipios' ? MapPin : HeartPulse;
  return <div className={id==='personas' ? 'respuesta' : 'dato-bento'}><span><Icono aria-hidden/>{titulo}
    <button type="button" popoverTarget={`regla-${id}`} aria-label={`Cómo se calculó: ${titulo}`} title="Cómo se calculó"><ArrowUpRight aria-hidden /></button></span>
    <strong data-kpi={id}>{valor == null ? '—' : valor.toLocaleString('es-MX')}</strong>
    <p>{unidad} · {corte ? `Corte ${fechaEs(corte)}` : 'Sin corte'}</p>
    <small>{delta===null ? 'Sin periodo previo' :
      <><Cambio aria-hidden/>{delta>0 ? '+' : ''}{delta.toLocaleString('es-MX')} vs. anterior</>}</small>
    <div className="atlas-regla" id={`regla-${id}`} popover="auto"><strong>Cómo se calculó</strong><p>{regla}</p>
      {delta!==null && <p>Periodo anterior: {referencia} ({previo}).</p>}</div>
  </div>;
}

export default async function Tablero({ searchParams }: PageProps<'/tablero'>) {
  const q = await searchParams, f = seleccionDe(q), d = await leerTablero(f);
  const corte = d.corte || '';
  const referencia = d.anterior ? periodoTexto(d.anterior) : '';
  const avanzado = impactoPublico();
  return <div className="archivo-eira atlas">
    <header className="apertura atlas-titulo"><div><h1>Tablero de impacto</h1>
      {corte && <time dateTime={corte}><CalendarDays size={16} aria-hidden />Corte al {new Intl.DateTimeFormat('es-MX',
        { day:'numeric',month:'long',year:'numeric',timeZone:'UTC' }).format(new Date(corte+'T12:00:00Z'))}</time>}</div><AccionesTablero /></header>
    <FiltrosAtlas seleccion={f} opciones={d.opciones} personas={d.personas} corte={corte || new Date().toISOString().slice(0,10)} />
    <section className="hoja" aria-label="Indicadores"><div className="resumen-bento atlas-kpis">
      <Cifra titulo="Personas impactadas" id="personas" valor={d.personas} unidad={f.programa.length===1 ? 'personas' : 'por programa'} corte={corte} previo={d.comparacion?.personas} referencia={referencia}
        regla="En la selección, cada beneficiaria o participante identificada cuenta una vez por programa, aunque tenga varios registros." />
      <Cifra titulo="Edad promedio" id="edad" valor={d.edad} unidad="años" corte={corte} previo={d.comparacion?.edad} referencia={referencia}
        regla="Se promedia la edad al corte de las personas impactadas de la selección con nacimiento conocido, sin repetir personas entre programas." />
      <Cifra titulo="Municipios" id="municipios" valor={d.municipios} unidad="con actividad" corte={corte} previo={d.comparacion?.municipios} referencia={referencia}
        regla="Se cuenta una sola vez cada municipio con clave oficial y al menos un registro en la selección." />
      {d.conDonantes && <Cifra titulo="Donantes de cabello" id="donantes" valor={d.donantes} unidad="personas" corte={corte} previo={d.comparacion?.donantes} referencia={referencia}
        regla="Se cuenta una vez por programa a cada persona identificada con una donación en la selección." />}
    </div></section>
    <div className="atlas-rejilla">
      <AtlasTerritorial lugares={d.lugares} f={f} nacional={q.mapa === 'mx'} />
      <MesesBento key={`${f.desde}:${f.hasta}`} serie={d.meses} desde={f.desde} hasta={f.hasta} />
      <ParesBento decididos={d.decididos} pendientes={d.pares} />
      <ServiciosBento servicios={d.unidades}/>
      <CargasBento cargas={d.cargas}/>
      <Distribucion titulo="Grupos de edad" unidad="Personas" serie={d.edades} />
    </div>
    <aside className="atlas-calidad"><CircleHelp size={17} aria-hidden /><p><strong>Calidad</strong> {d.pares} pares pendientes · {d.sinId} filas sin identificar</p>
      <Link href="/informe/global/calidad">Revisar calidad <ArrowUpRight size={15} aria-hidden /></Link></aside>
    {avanzado && <a className="bento-avanzado" href={avanzado} target="_blank" rel="noreferrer" aria-label="Análisis avanzado: abrir el tablero global en Metabase">Análisis avanzado <ArrowUpRight size={15} aria-hidden /></a>}
    <TableroVivo revision={d.revision}/>
  </div>;
}
