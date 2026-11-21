import { etiquetaPeriodo, type FiltrosMulti, type Opcion, type Opciones } from './filtros-comun';

type Lugar = { programa: string; estado: string; entidad: string; municipio: string; nombre: string; registros: number };
export type Serie = { programa: string; periodo: string; servicio: string; tipo: string; cantidad: number; grupos: number };
export type BaseFacetas = { lugares: Lugar[]; series: Serie[]; programas: { id: string; nombre: string; tipos: string[] }[]; tipos: Record<string,string> };

const alias: Record<string, string[]> = { '14023': ['Ciudad Guzmán', 'Cd. Guzmán', 'Zapotlán'], '14098': ['Tlaquepaque'], '14039': ['GDL'] };
const acepta = (vs: string[], v: string) => !vs.length || vs.includes(v);

function opciones(items: (Opcion & { cuenta: number })[]) {
  const valores = new Map<string, Opcion>();
  for (const item of items) {
    const previo = valores.get(item.valor);
    if (previo) previo.cuenta = (previo.cuenta ?? 0) + item.cuenta;
    else valores.set(item.valor, { ...item });
  }
  return [...valores.values()];
}

/** Presencia cuenta filas INEGI. Los contadores de actividad miden cantidades por
 * unidad y no conservan la clave INEGI: no unirlos por el texto libre del Excel. */
export function consultar(base: BaseFacetas, f: FiltrosMulti) {
  const estados = base.lugares.filter(l => acepta(f.estado, l.estado));
  const territorio = estados.filter(l => acepta(f.municipio, l.municipio));
  const geografia = f.estado.length > 0 || f.municipio.length > 0;
  const enTerritorio = new Set(territorio.map(l => l.programa));
  const lugares = territorio.filter(l => acepta(f.programa, l.programa));
  const activas = base.programas.filter(p => acepta(f.programa, p.id) && (!geografia || enTerritorio.has(p.id)));
  const tipos = new Map(activas.map(p => [p.id, p.tipos]));
  const disponibles = base.series.filter(s => tipos.has(s.programa));
  const seleccion = disponibles.filter(s => acepta(f.servicio, s.servicio) && acepta(f.periodo, s.periodo));
  const unidades = new Map<string, number>();
  for (const s of seleccion) {
    const nombre = s.programa === 'melenas-en-movimiento' && s.tipo === 'producto_entregado' ? 'Pelucas entregadas' : base.tipos[s.tipo];
    unidades.set(nombre, (unidades.get(nombre) ?? 0) + s.cantidad);
  }
  const municipios = opciones(lugares.map(l => ({ valor: l.municipio, texto: l.nombre, grupo: l.entidad, cuenta: l.registros })));
  const filtros: Opciones = {
    estado: opciones(base.lugares.map(l => ({ valor: l.estado, texto: l.entidad, cuenta: acepta(f.programa, l.programa) ? l.registros : 0, unidad: 'registros' }))),
    municipio: opciones(estados.map(l => ({ valor: l.municipio, texto: l.nombre, grupo: l.entidad, alias: alias[l.municipio], cuenta: acepta(f.programa, l.programa) ? l.registros : 0, unidad: 'registros' }))),
    programa: base.programas.map(p => ({ valor: p.id, texto: p.nombre,
      cuenta: territorio.filter(l => l.programa === p.id).reduce((n,l) => n+l.registros,0), unidad: 'registros con municipio' })),
    servicio: opciones(base.series.filter(s => s.servicio && (!f.programa.length || tipos.get(s.programa)?.includes(s.tipo))).map(s => ({
      valor: s.servicio, texto: s.servicio, cuenta: tipos.has(s.programa) && acepta(f.periodo,s.periodo) ? s.grupos : 0, unidad: 'grupos de actividad' }))),
    periodo: opciones(base.series.filter(s => s.periodo).map(s => ({ valor: s.periodo, texto: etiquetaPeriodo(s.periodo),
      cuenta: tipos.has(s.programa) && acepta(f.servicio,s.servicio) ? s.grupos : 0, unidad: 'grupos de actividad' }))),
  };
  return { filtros, municipios, unidades: [...unidades].map(([nombre,cantidad]) => ({ nombre, cantidad })),
    registros: lugares.reduce((n,l) => n + l.registros, 0) };
}
