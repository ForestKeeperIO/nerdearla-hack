import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogo, valoresPrograma } from './catalogo';
import { cnt, nac, presencia, trabajo } from './claves';
import { listarTrabajos, rolesDe, programasPresentes } from './datos';
import { fuentesDe, esAlcance } from './informe';
import { catalogoMunicipios } from './territorio';
import { valkey } from './valkey';

export const esReporte = (s: string) => s === 'aliados' || s === 'territorial';
export const cifraPublica = (n: number) => n > 0 && n < 5 ? '<5' : n.toLocaleString('es-MX');
const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export type Linea = { programa: string; cve: string; municipio: string; servicio: string; unidad: string; n: number };
const edades = ['Menos de 25', '25 a 39', '40 a 69', '70 o más'];

export function poblaciones() {
  const texto = readFileSync(join(process.cwd(),'..','publicos','jalisco_mun_denominadores_2020.csv'),'utf8');
  return new Map(texto.trim().split(/\r?\n/).slice(1).map(f => {
    const c = f.split(',');
    return [c[0], Number(c[4])] as const;
  }));
}

export async function leerReporte(programa: string) {
  if (!esAlcance(programa)) throw new Error('Programa no reconocido');
  const v = valkey();
  const [fs, programas, trabajos] = await Promise.all([fuentesDe(programa), programasPresentes(), listarTrabajos()]);
  const ids = programas.valor.filter(id => programa === 'global' || valoresPrograma(programa).includes(id));
  const roles = await rolesDe(programa === 'global' ? [] : valoresPrograma(programa));
  const fuentes = fs.valor;
  const corte = fuentes.map(f => f.fecha_corte).filter(Boolean).sort().at(-1) || '';
  const version = createHash('sha256').update(JSON.stringify(fuentes.map(f=>[f.id,f.cargada_en]).sort())).digest('hex').slice(0,8);
  const catalog = catalogoMunicipios();
  const pob = poblaciones();
  const registros = new Map<string, number>();
  const porNombre = new Map<string,string>();
  for (const id of ids) {
    const presentes = await v.hgetall(presencia(id));
    for (const [k,n] of Object.entries(presentes)) if (Number(n)>0) registros.set(k,(registros.get(k)||0)+Number(n));
    // Un texto de ciudad no basta: verificar el mapeo y la entidad de todos los archivos.
    const estados = await Promise.all(fuentes.filter(f=>f.programa===id).map(async f=>{
      const t = trabajos.valor.find(x=>x.estado==='listo' && x.fuente===f.id);
      if (!t || !t.mapeo?.some(c=>c.campo==='ciudad') || t.mapeo.some(c=>['estado','municipio_clave','estado_clave','entidad_clave','municipio_corto'].includes(c.campo))) return '';
      return await v.hget(trabajo(t.id),'estado_clave');
    }));
    if (estados[0] && estados.every(e=>e===estados[0])) for (const m of catalog) {
      if (m.estado_clave === estados[0] && presentes[m.clave]) porNombre.set(`${id}|${normal(m.municipio)}`,m.clave);
    }
  }
  const municipios = catalog.filter(m=>registros.has(m.clave)).map(m=>({...m,n:registros.get(m.clave)!,poblacion:pob.get(m.clave)}));
  const lineas = new Map<string,Linea>();
  const periodos = new Set<string>();
  for (const t of catalogo().tipos_de_registro) {
    for (const [key,raw] of Object.entries(await v.hgetall(cnt(t.clave)))) {
      const [id,ciudad,periodo,svc] = key.split('|');
      if (!ids.includes(id) || Number(raw)<=0) continue;
      if (/^\d{4}-\d{2}$/.test(periodo)) periodos.add(periodo);
      const cve = porNombre.get(`${id}|${normal(ciudad)}`) || '';
      const municipio = catalog.find(m=>m.clave===cve)?.municipio || ciudad || 'Sin municipio';
      const k = JSON.stringify([id,cve,municipio,svc,t.clave]);
      const l = lineas.get(k) ?? {programa:id,cve,municipio,servicio:svc || 'Sin servicio registrado',unidad:t.clave,n:0};
      l.n += Number(raw); lineas.set(k,l);
    }
  }
  const fechas = roles.idsUnicos.length ? await v.hmget(nac(),...roles.idsUnicos) : [];
  const ages = fechas.flatMap(f=>{
    if (!f || !/^\d{4}-\d\d-\d\d$/.test(f) || !corte) return [];
    const n = Number(corte.slice(0,4))-Number(f.slice(0,4))-Number(corte.slice(5)<f.slice(5));
    return n>=0 && n<120 ? [n] : [];
  }).sort((a,b)=>a-b);
  const mitad = Math.floor(ages.length/2);
  const edad = { n:ages.length, sin:roles.idsUnicos.length-ages.length, total:roles.idsUnicos.length,
    media: ages.length>=5 ? ages.reduce((a,b)=>a+b,0)/ages.length : null,
    mediana: ages.length>=5 ? (ages[mitad]+ages[Math.floor((ages.length-1)/2)])/2 : null,
    grupos:edades.map((label,i)=>({label,n:ages.filter(x=>(x<25?0:x<40?1:x<70?2:3)===i).length})) };
  return {programa,corte,version,fuentes,municipios,lineas:[...lineas.values()],edad,periodos:[...periodos].sort(),
    impactadas:roles.totalImpactadas,donantes:roles.totalDonantes};
}
export type Reporte = Awaited<ReturnType<typeof leerReporte>>;

export function porServicio(lineas: Linea[]) {
  const m = new Map<string,{label:string;unidad:string;n:number}>();
  for (const l of lineas) {
    const key = JSON.stringify([l.unidad,l.servicio]);
    const s = m.get(key) || {label:l.servicio,unidad:l.unidad,n:0}; s.n+=l.n; m.set(key,s);
  }
  return [...m.values()].sort((a,b)=>b.n-a.n);
}
