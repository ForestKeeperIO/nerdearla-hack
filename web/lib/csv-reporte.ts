import { contextoReporte,type QueryReporte } from './contexto-reporte';
import type { InformeSeleccion } from './reporte-seleccion';
type Celda = number | string;

function csv(c: Celda) {
  let s = String(c);
  if (/^\s*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"','""')}"`;
}
const publicar = (n:number) => n>0 && n<5 ? '<5' : n;

export function csvReporte(tipo:string,q:QueryReporte,r:InformeSeleccion) {
  const {params:seleccion,programa:p,municipio:mun}=contextoReporte(q);
  const fuentes = r.fuentes.map(f=>f.nombre).join('; ');
  const filas:Celda[][] = [['cve_mun','municipio','servicio','unidad','grupo_edad','numerador','denominador','tasa','fecha_corte','fuente','version','programa','indicador','seleccion']];
  function fila(c:Celda[],programa:string,indicador:string,origen=fuentes) { filas.push([...c,r.corte,origen,r.version,programa,indicador,seleccion.toString()]); }
  if (r.fuentes.length) {
    for (const l of r.lineas.filter(l=>!mun || l.cve===mun)) fila([l.cve,l.municipio,l.servicio,l.unidad,'',publicar(l.n),'',''],l.programa,'actividad');
    if (tipo==='territorial') for (const m of r.municipios.filter(m=>!mun || m.clave===mun)) {
      fila([m.clave,m.municipio,'','registro','',publicar(m.n),'',''],p,'presencia');
      if (m.poblacion!==undefined) fila([m.clave,m.municipio,'Papanicolaou','mujeres','25-64','',m.poblacion,''],p,'poblacion_objetivo','INEGI, Censo 2020, ITER Jalisco');
    }
    if (tipo==='aliados') {
      fila(['','','','persona','',publicar(r.impactadas),'',''],p,'personas_impactadas');
      fila(['','','','persona','',publicar(r.donantes),'',''],p,'donantes');
      for (const g of r.edad.grupos) fila(['','','','persona',g.label,publicar(g.n),'',''],p,'personas_por_edad');
      fila(['','','','persona','Sin edad',publicar(r.edad.sin),'',''],p,'personas_sin_edad');
    }
    if (tipo==='territorial') for (const t of r.tasas) fila([t.clave,t.municipio,'Papanicolaou','atencion','25-64',publicar(t.n),t.den,t.tasa===null?'':t.tasa.toFixed(4)],p,'atenciones_por_1000',`${fuentes}; INEGI, Censo 2020`);
  }
  return '\uFEFF'+filas.map(f=>f.map(csv).join(',')).join('\r\n')+'\r\n';
}
