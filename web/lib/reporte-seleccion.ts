import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { CAMPOS } from './seleccion-tablero';
import { contextoReporte, type QueryReporte } from './contexto-reporte';
import { leerReporte, poblaciones, type Linea, type Reporte } from './reportes';
import { fuentesDe } from './informe';
import { baseAnalitica } from './base-analitica';
import { motorActivo } from './claves';

const campos = {estado:'estado_clave',municipio:'municipio_clave',programa:'iniciativa_id',servicio:'servicio'};
export type Tasa = {clave:string;municipio:string;n:number;den:number;tasa:number|null};
export type InformeSeleccion = Reporte & {tasas:Tasa[];jornadas:number|null;disponible:boolean};

/** Mismo lector analítico que Tablero: una transacción de solo lectura, nunca datos nominales al navegador. */
export async function informeSeleccion(query:QueryReporte):Promise<InformeSeleccion> {
  const { f,programa,municipio }=contextoReporte(query);
  const ruta=baseAnalitica();
  if (!ruta) {
    const r=await leerReporte(programa);
    const filtrado=!!(municipio||f.estado.length||f.municipio.length||f.servicio.length||f.desde||f.hasta||f.programa.length>1);
    if (filtrado) return {...r,disponible:false,fuentes:[],lineas:[],municipios:[],periodos:[],impactadas:0,donantes:0,edad:{total:0,sin:0,n:0,media:null,mediana:null,grupos:[]},tasas:[],jornadas:null};
    return {...r,disponible:true,tasas:[],jornadas:null};
  }
  const origenes = (await fuentesDe('global')).valor;
  const db=new DatabaseSync(ruta,{readOnly:true});
  try {
    db.exec('BEGIN');
    const where=["r.contado=1","i.clase<>'fuente_publica'"];
    const args:string[]=[];
    for (const c of CAMPOS) if (f[c].length) { where.push(`r.${campos[c]} IN (SELECT value FROM json_each(?))`);args.push(JSON.stringify(f[c])); }
    if (municipio) {where.push('r.municipio_clave=?');args.push(municipio);}
    if (f.desde) {where.push('r.periodo>=?');args.push(f.desde);}
    if (f.hasta) {where.push("r.periodo<>'' AND r.periodo<=?");args.push(f.hasta);}
    const cte=`WITH filas AS (SELECT r.*,rol.cuenta_como_impactada impacto,COALESCE(m.municipio,NULLIF(r.municipio,''),NULLIF(r.ciudad,''),'Sin municipio') lugar
      FROM v_registros_ef r JOIN iniciativas i ON i.id=r.iniciativa_id LEFT JOIN roles_de_persona rol ON rol.clave=r.rol_persona
      LEFT JOIN municipios m ON m.clave=r.municipio_clave WHERE ${where.join(' AND ')}),
      positivas AS (SELECT * FROM filas WHERE cantidad>0 AND persona_ef IS NOT NULL) `;
    const all=<T,>(sql:string)=>db.prepare(cte+sql).all(...args) as T[];
    const [{impactadas,donantes}]=all<{impactadas:number;donantes:number}>(`SELECT COALESCE(SUM(p),0) impactadas, COALESCE(SUM(d),0) donantes FROM
      (SELECT COUNT(DISTINCT CASE WHEN impacto=1 THEN persona_ef END) p, COUNT(DISTINCT CASE WHEN rol_persona='donante' THEN persona_ef END) d FROM positivas GROUP BY iniciativa_id)`);
    const edades=all<{edad:number|null}>(`SELECT e.edad FROM (SELECT DISTINCT persona_ef FROM positivas WHERE impacto=1) p
      LEFT JOIN v_edad e ON e.persona=p.persona_ef ORDER BY e.edad`).map(x=>x.edad);
    const validas=edades.filter((n):n is number=>n!==null && n>=0 && n<120);
    const n=validas.length;
    const edad={n,sin:edades.length-n,total:edades.length,media:n>=5?validas.reduce((a,b)=>a+b,0)/n:null,
      mediana:n>=5?(validas[Math.floor(n/2)]+validas[Math.floor((n-1)/2)])/2:null,
      grupos:['Menos de 25','25 a 39','40 a 69','70 o más'].map((label,i)=>({label,n:validas.filter(x=>(x<25?0:x<40?1:x<70?2:3)===i).length}))};
    const pob=poblaciones();
    const municipios=all<Omit<Reporte['municipios'][number],'poblacion'>>(`SELECT municipio_clave clave,lugar municipio,estado_clave,estado,COUNT(*) n FROM filas
      WHERE municipio_clave<>'' GROUP BY municipio_clave ORDER BY lugar`).map(m=>({...m,poblacion:pob.get(m.clave)}));
    const lineas=all<Linea>(`SELECT iniciativa_id programa,COALESCE(municipio_clave,'') cve,lugar municipio,COALESCE(NULLIF(servicio,''),'Sin servicio registrado') servicio,
      tipo_registro unidad,SUM(cantidad) n FROM filas WHERE cantidad>0 GROUP BY iniciativa_id,municipio_clave,lugar,servicio,tipo_registro ORDER BY lugar,servicio`);
    const ids=new Set(all<{id:string}>('SELECT DISTINCT fuente_id id FROM filas').map(x=>x.id));
    const fuentes=origenes.filter(x=>ids.has(x.id));
    const corte=String(db.prepare('SELECT COALESCE(MAX(fecha_corte),?) corte FROM fuentes').get('')?.corte||'');
    const periodos=all<{p:string}>("SELECT DISTINCT periodo p FROM filas WHERE periodo<>'' ORDER BY periodo").map(x=>x.p);
    const [{jornadas}]=all<{jornadas:number}>("SELECT COUNT(*) jornadas FROM (SELECT DISTINCT fecha,municipio_clave FROM filas WHERE fecha<>'' AND municipio_clave<>'')");
    // Son atenciones o estudios según el archivo. No dar una tasa de estudios si la unidad dice atención.
    // Selma proyecta la pertenencia al grupo, no la fecha de nacimiento.
    const selma=motorActivo()==='selma';
    const edadObjetivo=selma ? 'edad_objetivo=1' : `p.fecha_nacimiento<>'' AND
      (CAST(strftime('%Y',fecha) AS INTEGER)-CAST(strftime('%Y',p.fecha_nacimiento) AS INTEGER)-
      (strftime('%m-%d',fecha)<strftime('%m-%d',p.fecha_nacimiento))) BETWEEN 25 AND 64`;
    const tasas=all<{clave:string;municipio:string;n:number}>(`SELECT municipio_clave clave,lugar municipio,SUM(cantidad) n
      FROM positivas ${selma?'':'JOIN personas p ON p.id=persona_ef'} WHERE servicio='Papanicolaou' AND tipo_registro='atencion'
      AND fecha<>'' AND municipio_clave<>'' AND ${edadObjetivo} GROUP BY municipio_clave,lugar`)
      .flatMap(t=>{const den=pob.get(t.clave);return den?[{...t,den,tasa:t.n>=5?1000*t.n/den:null}]:[];});
    const version=createHash('sha256').update(JSON.stringify([f,municipio,fuentes.map(x=>x.id),lineas,impactadas,donantes,edad,tasas])).digest('hex').slice(0,8);
    return {programa,corte,version,fuentes,lineas,periodos,municipios,edad,impactadas,donantes,tasas,jornadas,disponible:true};
  } finally {db.close();}
}
