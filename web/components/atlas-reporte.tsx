import formas from '@/lib/mapas.json';
import type { Reporte } from '@/lib/reportes';

export function AtlasReporte({ municipios, nacional }: { municipios: Reporte['municipios']; nacional: boolean }) {
  const conteos = new Map<string, number>();
  for (const m of municipios) {
    const k = nacional ? m.estado_clave : m.clave;
    conteos.set(k,(conteos.get(k)||0)+m.n);
  }
  const capa = formas[nacional ? 1 : 0];
  const max = Math.max(5,...conteos.values());
  return <figure className="atlas-reporte"><svg viewBox="0 0 600 370" role="img" aria-label={nacional ? 'Registros por entidad de México' : 'Registros por municipio de Jalisco'}>
    {capa.map(f=><path key={f.k} d={f.d}/>)}
    {capa.map(f=>{const n=conteos.get(f.k)||0; return n>=5 && <circle key={f.k} cx={f.xy[0]} cy={f.xy[1]} r={17*Math.sqrt(n/max)}><title>{`${f.k}: ${n} registros`}</title></circle>;})}
  </svg><figcaption>Área del círculo proporcional a registros. Menos de 5: sin símbolo. Límites: INEGI, 2025.</figcaption></figure>;
}
