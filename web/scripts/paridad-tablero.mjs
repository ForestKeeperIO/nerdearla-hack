// Solo lectura. Ejecutar desde web/ con el tablero, Metabase y el mismo IMPACTO_DB.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const app = process.env.TABLERO_URL ?? 'http://127.0.0.1:3103';
const enlace = new URL(JSON.parse(readFileSync(new URL('../../metabase/enlaces.json',import.meta.url),'utf8')).impacto);
const api = `${process.env.METABASE_URL || enlace.origin}/api${enlace.pathname}`;
const dashboard = await (await fetch(api)).json();

async function tarjeta(nombre, filtros) {
  const card = dashboard.dashcards.find(c => c.card?.name?.startsWith(nombre));
  assert.ok(card, `Falta pregunta pública: ${nombre}`);
  const parametros = Object.entries(filtros).map(([id,valor]) => {
    const m = card.parameter_mappings.find(x => x.parameter_id === id);
    assert.ok(m, `La pregunta ${nombre} no admite ${id}`);
    return { id, type:'string/=', target:m.target, value:[valor] };
  });
  const r = await fetch(`${api}/dashcard/${card.id}/card/${card.card_id}?`+new URLSearchParams({parameters:JSON.stringify(parametros)}));
  assert.ok(r.ok, `Metabase HTTP ${r.status}`);
  return (await r.json()).data.rows;
}

async function indicadores(q) {
  const r = await fetch(`${app}/tablero?`+new URLSearchParams(q));
  assert.ok(r.ok, `Tablero HTTP ${r.status}`);
  return Object.fromEntries([...((await r.text()).matchAll(/data-kpi="(\w+)">([^<]+)/g))].map(([,k,v]) => [k,Number(v)]));
}

for (const programa of ['', 'tamizaje-rosa', 'melenas-en-movimiento']) {
  const f = programa ? {programa} : {}, cifras = await indicadores(f);
  for (const [id,nombre] of [['personas','Personas impactadas'],['municipios','Municipios con presencia'],['donantes','Donantes de cabello'],['edad','Edad promedio']]) {
    if (programa && id==='edad') continue; // La tarjeta publicada de edad es exclusivamente global.
    const valor = Number.parseFloat((await tarjeta(nombre,f))[0][0]);
    if (id==='donantes' && programa==='tamizaje-rosa') { assert.equal(valor,0); assert.equal(cifras[id],undefined); }
    else assert.equal(cifras[id],valor,`${programa || 'Global'}: ${id}`);
  }
  console.log('Metabase público = tablero (tarjetas con filtros compatibles)',programa || 'Global',cifras);
}

const servicio = 'Exploración clínica', programa = 'tamizaje-rosa';
const q = { programa,servicio,municipio:'14050,14077,14079',desde:'2026-02',hasta:'2026-10' };
const db = new DatabaseSync(process.env.IMPACTO_DB,{readOnly:true});
try {
  const origen = `FROM v_registros_ef r WHERE r.contado=1 AND r.iniciativa_id=? AND r.servicio=?
    AND r.periodo BETWEEN ? AND ? AND r.municipio_clave IN (SELECT value FROM json_each(?))`;
  const args = [programa,servicio,q.desde,q.hasta,JSON.stringify(q.municipio.split(','))];
  const cohort = `SELECT DISTINCT r.persona_ef ${origen} AND r.cantidad>0 AND r.persona_ef IS NOT NULL
    AND r.rol_persona IN (SELECT clave FROM roles_de_persona WHERE cuenta_como_impactada=1)`;
  const {personas} = db.prepare(`SELECT COUNT(*) personas FROM (${cohort})`).get(...args);
  const {edad} = db.prepare(`SELECT ROUND(AVG(edad),1) edad FROM v_edad WHERE persona IN (${cohort})`).get(...args);
  const {municipios,registros} = db.prepare(`SELECT COUNT(DISTINCT municipio_clave) municipios,COUNT(*) registros ${origen}`).get(...args);
  assert.deepEqual(await indicadores(q),{personas,edad,municipios});
  const csv = await (await fetch(`${app}/tablero/cifras.csv?`+new URLSearchParams(q))).text();
  assert.ok(csv.includes(`"Personas impactadas por programa","${personas}"`));
  assert.ok(csv.includes(`"Servicio","${servicio}","${registros}","registros"`));
  console.log('Vistas SQLite = tablero = CSV (cruce no admitido por las tarjetas públicas)',{personas,edad,municipios,registros});
  const mes = '2026-09';
  const [[nombre,n]] = await tarjeta('Servicios más frecuentes',{programa,mes,servicio});
  const csvMes = await (await fetch(`${app}/tablero/cifras.csv?`+new URLSearchParams({programa,desde:mes,hasta:mes,servicio}))).text();
  // La pregunta pública suma v_conteos.total (cantidad), no las filas de la hoja.
  assert.equal(nombre,servicio);
  assert.ok(csvMes.includes(`"Servicio por unidad","${nombre}","${n}","atenciones"`));
  console.log('Metabase público = atenciones del CSV (programa + mes + servicio)',{mes,nombre,n});
} finally { db.close(); }
