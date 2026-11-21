import Link from 'next/link';
import { ArrowUpRight, CalendarDays, CircleHelp, Info } from 'lucide-react';
import { FiltrosAtlas } from '@/components/filtros-atlas';
import { AtlasTerritorial } from '@/components/atlas-territorial';
import { Distribucion, PorMes } from '@/components/desgloses-atlas';
import { fechaEs } from '@/lib/comun';
import { seleccionDe } from '@/lib/seleccion-tablero';
import { leerTablero } from '@/lib/tablero-impacto';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tablero de impacto · EIRA' };

function Cifra({ titulo, valor, unidad, corte, regla, id }: {
  titulo: string; valor: number | null; unidad: string; corte: string; regla: string; id: string;
}) {
  return <article className="atlas-cifra"><div><h2>{titulo}</h2>
    <button type="button" popoverTarget={`regla-${id}`} aria-label={`Cómo se calculó: ${titulo}`} title="Cómo se calculó"><Info size={17} strokeWidth={1.5} aria-hidden /></button>
    <div className="atlas-regla" id={`regla-${id}`} popover="auto"><strong>Cómo se calculó</strong><p>{regla}</p></div>
    </div><p><b data-kpi={id}>{valor == null ? '—' : valor.toLocaleString('es-MX')}</b><span>{unidad}</span></p>
    <small>{corte ? `Corte ${fechaEs(corte)}` : 'Sin fecha de corte'}</small>
  </article>;
}

export default async function Tablero({ searchParams }: PageProps<'/tablero'>) {
  const q = await searchParams, f = seleccionDe(q), d = leerTablero(f);
  const corte = d.corte || '';
  return <div className="atlas">
    <header className="atlas-titulo"><h1>Tablero de impacto</h1>
      {corte && <time dateTime={corte}><CalendarDays size={16} aria-hidden />Corte al {new Intl.DateTimeFormat('es-MX',
        { day:'numeric',month:'long',year:'numeric',timeZone:'UTC' }).format(new Date(corte+'T12:00:00Z'))}</time>}</header>
    <FiltrosAtlas seleccion={f} opciones={d.opciones} personas={d.personas} corte={corte || new Date().toISOString().slice(0,10)} />
    <section className="atlas-kpis" aria-label="Indicadores">
      <Cifra titulo="Personas impactadas" id="personas" valor={d.personas} unidad={f.programa.length===1 ? 'personas' : 'por programa'} corte={corte}
        regla="En la selección, cada beneficiaria o participante identificada cuenta una vez por programa, aunque tenga varios registros." />
      <Cifra titulo="Edad promedio" id="edad" valor={d.edad} unidad="años" corte={corte}
        regla="Se promedia la edad al corte de las personas impactadas de la selección con nacimiento conocido, sin repetir personas entre programas." />
      <Cifra titulo="Presencia" id="municipios" valor={d.municipios} unidad="municipios" corte={corte}
        regla="Se cuenta una sola vez cada municipio con clave oficial y al menos un registro en la selección." />
      {d.conDonantes && <Cifra titulo="Donantes de cabello" id="donantes" valor={d.donantes} unidad="donantes" corte={corte}
        regla="Se cuenta una vez por programa a cada persona identificada con una donación en la selección." />}
    </section>
    <div className="atlas-rejilla">
      <AtlasTerritorial lugares={d.lugares} f={f} nacional={q.mapa === 'mx'} />
      <Distribucion titulo="Grupos de edad" unidad="Personas" serie={d.edades} />
      <Distribucion titulo="Por servicio" unidad="Registros" serie={d.servicios} />
      <PorMes serie={d.meses} />
    </div>
    <aside className="atlas-calidad"><CircleHelp size={17} aria-hidden /><p><strong>Calidad</strong> {d.pares} pares pendientes · {d.sinId} filas sin identificar</p>
      <Link href="/informe/global/calidad">Revisar calidad <ArrowUpRight size={15} aria-hidden /></Link></aside>
  </div>;
}
