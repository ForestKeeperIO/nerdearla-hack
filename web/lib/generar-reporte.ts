'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { descripcionSeleccion, revisionFuentes, rutaEdicion, type Instantanea } from './archivo-reportes';
import { reporteGuardado, reportesGenerados, valores } from './claves';
import { contextoReporte } from './contexto-reporte';
import { csvReporte } from './csv-reporte';
import { esAlcance } from './informe';
import { soloLectura } from './modo-carga';
import { imprimirRuta } from './pdf-reporte';
import { informeSeleccion } from './reporte-seleccion';
import { valkey } from './valkey';

export async function generarReporte(tipo:string,consulta:string) {
  if(soloLectura()) redirect('/reportes?aviso=consulta');
  if((tipo!=='aliados' && tipo!=='territorial') || typeof consulta!=='string' || consulta.length>4000) redirect('/reportes?aviso=seleccion');
  const q=Object.fromEntries(new URLSearchParams(consulta));
  const {f,municipio,params}=contextoReporte(q), v=valkey();
  if(f.programa.some(p=>!esAlcance(p))||[...f.municipio,...(municipio?[municipio]:[])].some(c=>!/^\d{5}$/.test(c))||
     f.estado.some(c=>!/^\d{2}$/.test(c))) redirect('/reportes?aviso=seleccion');
  if(f.servicio.length){
    const catalogo=new Set(await v.smembers(valores('servicio')));
    if(f.servicio.some(s=>!catalogo.has(s))) redirect('/reportes?aviso=seleccion');
  }
  const revision=await revisionFuentes(), r=await informeSeleccion(q);
  if(!r.disponible || !r.fuentes.length) redirect(`/reportes?${params}&aviso=sin-datos`);
  if(revision!==await revisionFuentes()) redirect(`/reportes?${params}&aviso=cambio`);
  const id=randomUUID(), en=Date.now(), key=reporteGuardado(id);
  const portada:Instantanea['portada']={id,tipo,generado:new Date(en).toISOString(),corte:r.corte,revision,version:r.version,
    consulta:params.toString(),seleccion:descripcionSeleccion(q),impactadas:r.impactadas,donantes:r.donantes,municipios:r.municipios.length};
  // No se archivan nombres de archivo, responsable, etiquetas de personas ni filas nominales.
  const informe={...r,fuentes:r.fuentes.map(f=>({...f,nombre:`Fuente ${f.id}`,por:'',motivos:[]}))};
  const edicion:Instantanea={portada,informe};
  try {
    // El PDF lee la misma foto que el CSV. El borrador caduca si Chromium falla;
    // la edición no entra en el historial hasta que se guardan ambos archivos.
    await v.multi().hset(key,'edicion',JSON.stringify(edicion)).expire(key,180).exec();
    const pdf=await imprimirRuta(rutaEdicion(id));
    const resultado=await v.multi().hset(key,'portada',JSON.stringify(portada),'csv',csvReporte(tipo,q,informe),'pdf',pdf)
      .persist(key).zadd(reportesGenerados(),en,id).exec();
    if(!resultado || resultado.some(([e])=>e)) throw new Error('No se confirmó el archivo.');
  } catch {
    redirect(`/reportes?${params}&aviso=archivo`);
  }
  revalidatePath('/reportes');
  redirect(`/reportes?${params}&generado=${id}`);
}
