import { createHash } from 'node:crypto';
import { nombrePrograma } from './catalogo';
import { reporteGuardado, reportesGenerados } from './claves';
import { contextoReporte, type QueryReporte } from './contexto-reporte';
import { fuentesDe } from './informe';
import type { InformeSeleccion } from './reporte-seleccion';
import { catalogoMunicipios } from './territorio';
import { valkey } from './valkey';

export type TipoReporte='aliados'|'territorial';
export const titulos={aliados:'Impacto para aliados estratégicos',territorial:'Territorial para gobierno y hospitales'};
export const audiencias={aliados:'Aliados estratégicos',territorial:'Gobierno y hospitales'};
export type Portada={id:string;tipo:TipoReporte;generado:string;corte:string;revision:string;version:string;consulta:string;
  seleccion:string;impactadas:number;donantes:number;municipios:number};
export type Instantanea={portada:Portada;informe:InformeSeleccion};
export const rutaEdicion=(id:string)=>`/reportes/guardados/${id}`;
export const idValido=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);

export async function revisionFuentes() {
  const fuentes=(await fuentesDe('global')).valor;
  return createHash('sha256').update(JSON.stringify(fuentes.map(f=>[f.id,f.cargada_en,f.fecha_corte,f.filas_nuevas,f.filas_omitidas]).sort())).digest('hex');
}
export function descripcionSeleccion(q:QueryReporte) {
  const {f,municipio,periodo}=contextoReporte(q), cat=catalogoMunicipios();
  const estados=f.estado.map(c=>cat.find(m=>m.estado_clave===c)?.estado||c);
  const municipios=[...new Set([...f.municipio,...(municipio?[municipio]:[])])].map(c=>cat.find(m=>m.clave===c)?.municipio||c);
  return [f.programa.length?f.programa.map(nombrePrograma).join(', '):'Todos los programas',...estados,...municipios,...f.servicio,periodo].join(' · ');
}
export async function leerEdicion(id:string):Promise<Instantanea|null> {
  if(!idValido(id)) return null;
  const json=await valkey().hget(reporteGuardado(id),'edicion');
  return json?JSON.parse(json):null;
}
export async function historialReportes(pagina:number) {
  const v=valkey(), inicio=pagina*12;
  const ids=await v.zrevrange(reportesGenerados(),inicio,inicio+12);
  if (!ids.length) return {items:[] as Portada[],mas:false};
  const pipe=v.pipeline();
  for(const id of ids.slice(0,12)) pipe.hget(reporteGuardado(id),'portada');
  const registros=await pipe.exec();
  const items:Portada[]=[];
  for(const [error,json] of registros||[]) {
    if(error) throw error;
    if(typeof json==='string') items.push(JSON.parse(json));
  }
  return {items,mas:ids.length>12};
}
