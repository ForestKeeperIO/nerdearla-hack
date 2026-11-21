import { consultaDe, filtrosActivos, periodoTexto, seleccionDe } from './seleccion-tablero';

export type QueryReporte = Record<string,string|string[]|undefined>;
export function contextoReporte(q:QueryReporte) {
  const f=seleccionDe(q);
  const global=f.programa.includes('global') || q.origen==='tablero' || filtrosActivos(f)>0;
  f.programa=f.programa.filter(x=>x!=='global');
  if (!global && !f.programa.length) f.programa=['tamizaje-rosa'];
  const params=new URLSearchParams(consultaDe(f));
  if (!f.programa.length) params.set('programa','global');
  const municipio=typeof q.mun==='string'?q.mun:'';
  if (municipio) params.set('mun',municipio);
  if (q.mapa==='mexico' || q.mapa==='mx') params.set('mapa','mexico');
  return {f,params,municipio,periodo:periodoTexto(f),programa:f.programa.length===1?f.programa[0]:'global'};
}
