import { catalogo, nombrePrograma, tiposDe } from './catalogo';
import { cnt, presencia } from './claves';
import { listarFuentes, listarTrabajos, programasPresentes } from './datos';
import { catalogoMunicipios } from './territorio';
import { valkey } from './valkey';
import { alias, type BaseFacetas, type Serie } from './facetas';
import { normaliza } from './filtros-comun';

export async function leerActividad(): Promise<BaseFacetas> {
  const v = valkey();
  const [presentes, fuentes, trabajos] = await Promise.all([programasPresentes(), listarFuentes(), listarTrabajos()]);
  const ids = presentes.valor;
  const oficiales = new Map(catalogoMunicipios().map((m) => [m.clave, m]));
  const lugares = (await Promise.all(ids.map(async (programa) =>
    Object.entries(await v.hgetall(presencia(programa))).flatMap(([id, n]) => {
      const m = oficiales.get(id);
      return m && Number(n) > 0 ? [{ programa, estado: m.estado_clave, entidad: m.estado, municipio: id, nombre: m.municipio, registros: Number(n) }] : [];
    })
  ))).flat();
  // cnt conserva la ciudad literal, no la clave. Solo se puede desambiguar
  // si TODAS las fuentes usan ciudad + un mismo estado del trabajo y ninguna
  // fila tiene una clave o entidad propia que prevalezca sobre ese texto.
  const normal = (s: string) => normaliza(s).replace(/[^a-z0-9]+/g,' ').trim();
  const porNombre = new Map<string,string>();
  for (const id of ids) {
    const origenes = fuentes.valor.filter(s => s.programa === id);
    const jobs = origenes.map(s => trabajos.valor.find(t => t.estado === 'listo' && t.fuente === s.id));
    const estado = jobs[0]?.estado_clave;
    if (!estado || !jobs.every(t => t?.estado_clave === estado && t.mapeo?.some(c => c.campo === 'ciudad') &&
      !t.mapeo.some(c => ['estado','estado_clave','entidad_clave','municipio_clave','municipio_corto'].includes(c.campo)))) continue;
    for (const l of lugares.filter(l => l.programa === id && l.estado === estado)) {
      for (const nombre of [l.nombre,...alias[l.municipio] ?? []]) porNombre.set(`${id}|${normal(nombre)}`,l.municipio);
    }
  }
  const tipos = catalogo().tipos_de_registro;
  const series = (await Promise.all(tipos.map(async (t) => {
    const agregado = new Map<string, Serie>();
    for (const [campo, n] of Object.entries(await v.hgetall(cnt(t.clave)))) {
      const [programa, ciudad, periodo, servicio] = campo.split('|');
      if (!(Number(n) > 0)) continue;
      const municipio = porNombre.get(`${programa}|${normal(ciudad)}`) ?? '';
      const key = JSON.stringify([programa, municipio, periodo, servicio]);
      const s = agregado.get(key) ?? { programa, municipio, periodo, servicio, tipo: t.clave, cantidad: 0 };
      s.cantidad += Number(n);
      agregado.set(key, s);
    }
    return [...agregado.values()];
  }))).flat();
  return { lugares, series, programas: ids.map((id) => ({ id, nombre: nombrePrograma(id), tipos: tiposDe(id).map(t => t.clave) })),
    tipos: Object.fromEntries(tipos.map(t => [t.clave, t.plural])) };
}
