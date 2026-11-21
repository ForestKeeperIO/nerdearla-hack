import { etiquetaPeriodo, type FiltrosMulti, type Opcion, type Opciones } from './filtros-comun';

type Lugar = { programa: string; estado: string; entidad: string; municipio: string; nombre: string; registros: number };
export type Serie = { programa: string; municipio: string; periodo: string; servicio: string; tipo: string; cantidad: number };
export type BaseFacetas = { lugares: Lugar[]; series: Serie[]; programas: { id: string; nombre: string; tipos: string[] }[]; tipos: Record<string,string> };

export const alias: Record<string, string[]> = { '14023': ['Ciudad Guzmán', 'Cd. Guzmán', 'Zapotlán'], '14098': ['Tlaquepaque'], '14039': ['GDL'] };
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

/** cnt solo incluye filas identificadas con cantidad positiva (una por fila).
 * Las fuentes públicas agregadas sin persona no entran en estos contadores. */
export function consultar(base: BaseFacetas, f: FiltrosMulti) {
  const estados = base.lugares.filter(l => acepta(f.estado, l.estado));
  const territorio = estados.filter(l => acepta(f.municipio, l.municipio));
  const geografia = f.estado.length > 0 || f.municipio.length > 0;
  const enTerritorio = new Set(territorio.map(l => l.programa));
  const restringeActividad = !!(f.servicio.length || f.periodo.length);
  const enActividad = (s: Serie) => acepta(f.servicio,s.servicio) && acepta(f.periodo,s.periodo);
  const porLugar = new Map<string,number>();
  for (const s of base.series.filter(enActividad)) {
    const k = `${s.programa}|${s.municipio}`;
    porLugar.set(k,(porLugar.get(k) ?? 0)+s.cantidad);
  }
  const nLugar = (l: Lugar) => restringeActividad ? porLugar.get(`${l.programa}|${l.municipio}`) ?? 0 : l.registros;
  const lugares = territorio.filter(l => acepta(f.programa, l.programa) && nLugar(l)>0);
  const activas = base.programas.filter(p => acepta(f.programa, p.id) && (!geografia || enTerritorio.has(p.id)));
  const tipos = new Map(activas.map(p => [p.id, p.tipos]));
  const enLugar = (s: Serie) => !geografia || (!!s.municipio && acepta(f.estado,s.municipio.slice(0,2)) && acepta(f.municipio,s.municipio));
  const disponibles = base.series.filter(s => tipos.has(s.programa) && enLugar(s));
  const seleccion = disponibles.filter(enActividad);
  const unidades = new Map<string, number>();
  for (const s of seleccion) {
    const nombre = s.programa === 'melenas-en-movimiento' && s.tipo === 'producto_entregado' ? 'Pelucas entregadas' : base.tipos[s.tipo];
    unidades.set(nombre, (unidades.get(nombre) ?? 0) + s.cantidad);
  }
  const municipios = opciones(lugares.map(l => ({ valor: l.municipio, texto: l.nombre, grupo: l.entidad, cuenta: nLugar(l) })));
  const filtros: Opciones = {
    estado: opciones(base.lugares.map(l => ({ valor: l.estado, texto: l.entidad, cuenta: acepta(f.programa, l.programa) ? nLugar(l) : 0, unidad: 'registros' }))),
    municipio: opciones(estados.map(l => ({ valor: l.municipio, texto: l.nombre, grupo: l.entidad, alias: alias[l.municipio], cuenta: acepta(f.programa, l.programa) ? nLugar(l) : 0, unidad: 'registros' }))),
    programa: base.programas.map(p => ({ valor: p.id, texto: p.nombre,
      cuenta: geografia || !restringeActividad ? territorio.filter(l => l.programa === p.id).reduce((n,l) => n+nLugar(l),0)
        : base.series.filter(s => s.programa === p.id && enActividad(s)).reduce((n,s) => n+s.cantidad,0), unidad: 'registros' })),
    servicio: opciones(base.series.filter(s => s.servicio && (!f.programa.length || tipos.get(s.programa)?.includes(s.tipo))).map(s => ({
      valor: s.servicio, texto: s.servicio, cuenta: tipos.has(s.programa) && enLugar(s) && acepta(f.periodo,s.periodo) ? s.cantidad : 0, unidad: 'registros identificados' }))),
    periodo: opciones(base.series.filter(s => s.periodo).map(s => ({ valor: s.periodo, texto: etiquetaPeriodo(s.periodo),
      cuenta: tipos.has(s.programa) && enLugar(s) && acepta(f.servicio,s.servicio) ? s.cantidad : 0, unidad: 'registros identificados' }))),
  };
  return { filtros, municipios, unidades: [...unidades].map(([nombre,cantidad]) => ({ nombre, cantidad })),
    registros: lugares.reduce((n,l) => n + nLugar(l), 0) };
}
