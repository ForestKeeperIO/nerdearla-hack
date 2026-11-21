import { catalogo, nombrePrograma, tiposDe } from './catalogo';
import { cnt, presencia } from './claves';
import { programasPresentes } from './datos';
import { catalogoMunicipios } from './territorio';
import { valkey } from './valkey';
import type { BaseFacetas, Serie } from './facetas';

export async function leerActividad(): Promise<BaseFacetas> {
  const v = valkey();
  const ids = (await programasPresentes()).valor;
  const oficiales = new Map(catalogoMunicipios().map((m) => [m.clave, m]));
  const lugares = (await Promise.all(ids.map(async (programa) =>
    Object.entries(await v.hgetall(presencia(programa))).flatMap(([id, n]) => {
      const m = oficiales.get(id);
      return m && Number(n) > 0 ? [{ programa, estado: m.estado_clave, entidad: m.estado, municipio: id, nombre: m.municipio, registros: Number(n) }] : [];
    })
  ))).flat();
  const tipos = catalogo().tipos_de_registro;
  const series = (await Promise.all(tipos.map(async (t) => {
    const agregado = new Map<string, Serie>();
    for (const [campo, n] of Object.entries(await v.hgetall(cnt(t.clave)))) {
      const [programa, , periodo, servicio] = campo.split('|');
      if (!(Number(n) > 0)) continue;
      const key = JSON.stringify([programa, periodo, servicio]);
      const s = agregado.get(key) ?? { programa, periodo, servicio, tipo: t.clave, cantidad: 0, grupos: 0 };
      s.cantidad += Number(n);
      s.grupos++;
      agregado.set(key, s);
    }
    return [...agregado.values()];
  }))).flat();
  return { lugares, series, programas: ids.map((id) => ({ id, nombre: nombrePrograma(id), tipos: tiposDe(id).map(t => t.clave) })),
    tipos: Object.fromEntries(tipos.map(t => [t.clave, t.plural])) };
}
