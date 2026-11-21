import { normaliza } from './filtros-comun';

type Programa = { id: string; nombre: string; tipos_de_registro: string[] };

/** Solo señales distintivas: edad, nombre, ciudad o asistencia no distinguen programas. */
export function sugerirPrograma(muestra: unknown[][], programas: Programa[]): string | undefined {
  const normal = (v: unknown) => typeof v === 'string' ? normaliza(v).trim() : '';
  const celdas = new Set(muestra.flat().map(normal).filter(Boolean));
  const declarados = programas.filter(p => celdas.has(normal(p.nombre)) || celdas.has(p.id));
  if (declarados.length) return declarados.length === 1 ? declarados[0].id : undefined;

  const indicios = new Set<string>();
  function deTipoExclusivo(tipo: string) {
    const posibles = programas.filter(p => p.tipos_de_registro.includes(tipo));
    if (posibles.length === 1) indicios.add(posibles[0].id);
  }
  if (muestra[0]?.some(c => /^(tipo de )?movimiento$/.test(normal(c)))) deTipoExclusivo('donacion');
  for (const c of celdas) {
    if (/\b(donacion(es)?|trenzas?|pelucas?)\b/.test(c)) deTipoExclusivo('donacion');
    if (/\b(papanicolaou|mastografia|ultrasonido de mama)\b/.test(c)) deTipoExclusivo('estudio');
  }
  return indicios.size === 1 ? [...indicios][0] : undefined;
}
