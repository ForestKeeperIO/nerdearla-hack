import Link from 'next/link';
import { Download, ExternalLink, Info } from 'lucide-react';
import { Actualizar } from '@/components/actualizar';
import { FiltrosBarra } from '@/components/filtros-barra';
import { ParesMasa } from '@/components/pares-masa';
import { catalogo, nombrePrograma } from '@/lib/catalogo';
import { fechaEs, personasTxt } from '@/lib/comun';
import { edadPromedioIds, listarFuentes, rolesDe, sinIdentificar, valoresDe } from '@/lib/datos';
import { conteoUnidadMulti, filtrosDeQuery } from '@/lib/filtros';
import { fechaCorteDe, paresDe } from '@/lib/informe';
import { impactoPublico } from '@/lib/metabase';
import { presenciaDe } from '@/lib/territorio';

export const dynamic = 'force-dynamic';

function Indicador({ nombre, valor, unidad, regla, origen }: {
  nombre: string; valor: string; unidad: string; regla: string; origen: string;
}) {
  return <div className="mesa-dato">
    <h2>{nombre}</h2>
    <p className="mesa-numero">{valor}</p>
    <p className="mesa-unidad">{unidad}</p>
    <details><summary>Cómo se calculó</summary><p>{regla}</p><p>{origen}</p></details>
  </div>;
}

export default async function Tablero({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = filtrosDeQuery(await searchParams);
  const tipos = catalogo().tipos_de_registro;
  const [corte, roles, fuentes, pares, sinId, programas, ciudades, periodos, servicios, unidades] = await Promise.all([
    fechaCorteDe('global'), rolesDe(f.programa), listarFuentes(), paresDe('global'), sinIdentificar({}),
    valoresDe('programa'), valoresDe('ciudad'), valoresDe('periodo'), valoresDe('servicio'),
    Promise.all(tipos.map(async (t) => ({ nombre: t.plural, cantidad: (await conteoUnidadMulti(t.clave, f)).valor }))),
  ]);
  const [edad, lugares] = await Promise.all([
    edadPromedioIds(roles.idsUnicos, corte), Promise.all(roles.porPrograma.map((p) => presenciaDe(p.id))),
  ]);
  const municipios = new Map<string, { nombre: string; estado: string; registros: number }>();
  for (const lugar of lugares) for (const estado of lugar?.estados ?? []) for (const m of estado.activos) {
    municipios.set(m.clave, { nombre: m.nombre, estado: estado.estado, registros: (municipios.get(m.clave)?.registros ?? 0) + m.registros });
  }
  const pendientes = pares.valor.filter((p) => p.estado === 'pendiente');
  const fuentePorId = Object.fromEntries(fuentes.valor.map((x) => [x.id, x.nombre]));
  const alcance = f.programa.length === 1 ? nombrePrograma(f.programa[0]) : 'Suma por programa';
  const archivos = fuentes.valor.filter((x) => !f.programa.length || f.programa.includes(x.programa));
  const origen = `Corte: ${fechaEs(corte)}. Fuente: ${archivos.map((x) => x.nombre).join(', ') || 'sin archivos'}.`;
  const metabase = impactoPublico({ programa: f.programa, mes: f.periodo, servicio: f.servicio, municipio: f.ciudad });
  const exportar = f.programa.length === 1 && roles.porPrograma.length ? f.programa[0] : 'global';

  return <div className="mesa">
    <header className="mesa-cabecera">
      <div><h1>Tablero de impacto</h1>
        <p>Corte al <time dateTime={corte}>{fechaEs(corte)}</time> · {archivos.length} archivos de coordinación</p>
      </div>
      <div className="mesa-acciones"><Actualizar consulta={Date.now()} />
        <Link href={`/informe/${encodeURIComponent(exportar)}/exportar`} className="mesa-boton"><Download size={16} aria-hidden />Exportar informe</Link>
      </div>
    </header>

    <section aria-label="Filtros" className="mesa-filtros">
      <FiltrosBarra opciones={{ programa: programas.valor, ciudad: ciudades.valor, periodo: periodos.valor, servicio: servicios.valor }} activos={f} />
    </section>
    <section aria-label="Indicadores" className="mesa-indicadores">
      <Indicador nombre="Personas impactadas" valor={roles.totalImpactadas ? personasTxt(roles.totalImpactadas) : '0'} unidad={alcance}
        regla="Cada persona identificada cuenta una vez por programa donde recibió atención o participó." origen={origen} />
      <Indicador nombre="Edad promedio" valor={edad.valor.promedio?.toLocaleString('es-MX', { maximumFractionDigits: 1 }) ?? '—'} unidad={`Años · ${edad.valor.n} con fecha de nacimiento`}
        regla="Se promedian las edades al corte de las personas impactadas con fecha de nacimiento válida, sin repetirlas." origen={origen} />
      <Indicador nombre="Presencia territorial" valor={String(municipios.size)} unidad="Municipios con actividad"
        regla="Se cuenta cada clave oficial de municipio una sola vez entre los registros con lugar reconocido." origen={origen} />
      <Indicador nombre="Donantes" valor={roles.totalDonantes ? personasTxt(roles.totalDonantes) : '0'} unidad="Personas que donaron"
        regla="Cada donante identificada cuenta una vez; donar no equivale a recibir atención." origen={origen} />
    </section>

    {metabase && archivos.length > 0 && <section className="mesa-graficas" aria-label="Gráficas y presencia por estado">
      <div className="mesa-seccion"><h2>Actividad y presencia por estado</h2>
        <a href={metabase} target="_blank" rel="noreferrer">Abrir tablero completo <ExternalLink size={15} aria-hidden /></a></div>
      <p className="mesa-nota">Metabase: programa en cifras y gráficas; mes y servicio en actividad; municipio en presencia. Las selecciones múltiples no se trasladan a las gráficas.</p>
      <iframe title="Tablero público de impacto en Metabase" src={metabase} className="mesa-marco" />
    </section>}
    {(pendientes.length > 0 || sinId.valor > 0) && <aside className="aviso-banda">
      <Info aria-hidden size={16} /><span>{pendientes.length} pares por revisar · {sinId.valor} registros sin identificar</span>
      <a className="aviso-banda__accion" href="#pares">Revisar pares</a>
    </aside>}
    <section className="mesa-columna"><h2>Servicios por unidad</h2>
      <p className="mesa-nota">Cada unidad se informa por separado.</p>
      <dl>{unidades.filter((u) => u.cantidad > 0).map((u) => <div key={u.nombre}><dt>{u.nombre}</dt><dd>{u.cantidad.toLocaleString('es-MX')}</dd></div>)}</dl>
      {!unidades.some((u) => u.cantidad > 0) && <p>No hay servicios en esta selección.</p>}
    </section>
    <section className="mesa-columna"><h2>Municipios con actividad</h2><p className="mesa-nota">Registros por municipio oficial.</p>
      <dl>{[...municipios.entries()].sort((a, b) => b[1].registros - a[1].registros).map(([id, m]) => <div key={id}>
        <dt>{m.nombre}, {m.estado}</dt><dd>{m.registros.toLocaleString('es-MX')}</dd></div>)}</dl>
      {!municipios.size && <p>No hay municipios reconocidos.</p>}
    </section>
    <section id="pares" className="mesa-pares" aria-label="Posibles duplicados"><h2>Pares por decidir</h2>
      <p className="mesa-nota">Selecciona los pares que recibirán la misma decisión. La revisión incluye todos los programas.</p>
      <ParesMasa alcance="global" pares={pendientes} nombreFuente={fuentePorId} />
    </section>
  </div>;
}
