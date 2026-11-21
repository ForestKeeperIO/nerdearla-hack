'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { DURACION, FASES, HOJA_DEMO, NOMBRE_HOJA, PASOS, PROGRAMA_DEMO, etiquetaFase, fraseResultado, pasoValido } from '@/lib/demo-guiado';

const CLAVE = 'eira-demo';
const EVENTO = 'eira:demo';
const ANCHO = 348;

type Estado = { i: number; unidad: string; fechaCorte: string; trabajo?: string; subida?: string };
type Caja = { top: number; left: number; width: number; height: number };

function leer(): Estado | null {
  try {
    const e = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
    return e && typeof e === 'object' ? { ...e, i: pasoValido(e.i) } : null;
  } catch { return null; }
}
function escribir(e: Estado | null) {
  try { if (e) sessionStorage.setItem(CLAVE, JSON.stringify(e)); else sessionStorage.removeItem(CLAVE); } catch { /* Sin almacenamiento, el recorrido vive en memoria. */ }
}
const aqui = () => window.location.pathname + window.location.search;
const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

/** Manda la hoja de ejemplo al mismo punto de subida que usa «Subir archivos». */
async function subirHoja(e: Estado): Promise<{ id?: string; error?: string }> {
  try {
    const hoja = await fetch(HOJA_DEMO, { cache: 'no-store' });
    if (!hoja.ok) return { error: 'No se encontró la hoja de ejemplo.' };
    const fd = new FormData();
    fd.set('archivo', new File([await hoja.blob()], NOMBRE_HOJA, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    fd.set('programa', PROGRAMA_DEMO);
    fd.set('unidad', e.unidad);
    fd.set('estado_clave', '14');
    fd.set('fecha_corte', e.fechaCorte);
    fd.set('por', 'Presidencia');
    const r = await fetch('/api/subir', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    return r.ok && j?.ok ? { id: String(j.id) } : { error: j?.error || 'El servidor no confirmó la recepción.' };
  } catch { return { error: 'No se confirmó el envío. Revisa la conexión.' }; }
}

/** Capa del recorrido guiado. Vive en el layout y solo aparece tras entrar por /demo. */
export function DemoGuiado() {
  const router = useRouter(), ruta = usePathname();
  const [est, fijar] = useState<Estado | null>(null);
  const [caja, medir] = useState<Caja | null>(null);
  const [listo, alistar] = useState(false);
  const [ocupado, ocupar] = useState(false);
  const [extra, anotar] = useState('');
  const [pausa, pausar] = useState(false);
  // El reloj lleva su paso: al cambiar de paso, el tiempo del anterior no cuenta.
  const [reloj, contar] = useState({ i: -1, ms: 0 });
  const [alto, altura] = useState(220);
  const globo = useRef<HTMLElement>(null), navegado = useRef(-1), hecho = useRef(-1);

  const guardar = useCallback((e: Estado | null) => { escribir(e); fijar(e); }, []);
  const ir = useCallback((i: number) => {
    const e = leer();
    if (e) guardar({ ...e, i: pasoValido(i) });
  }, [guardar]);

  useEffect(() => {
    const cargar = () => { navegado.current = -1; hecho.current = -1; fijar(leer()); };
    cargar();
    window.addEventListener(EVENTO, cargar);
    return () => window.removeEventListener(EVENTO, cargar);
  }, []);

  const i = est?.i ?? -1, paso = i >= 0 ? PASOS[i] : null, activo = Boolean(paso) && ruta !== '/demo';
  const enRuta = paso ? ruta === paso.ruta.split('?')[0] : false;

  // Cada paso arranca limpio y navega solo, una sola vez, a su pantalla.
  useEffect(() => {
    if (!paso) return;
    alistar(false); medir(null); anotar(''); ocupar(Boolean(paso.accion));
    if (aqui() !== paso.ruta && navegado.current !== i) { navegado.current = i; router.push(paso.ruta); }
  }, [i, paso, router]);

  // Busca lo que se resalta, lo trae a la vista y sigue su posición.
  useEffect(() => {
    if (!paso || !enRuta) return;
    if (!paso.objetivo) { alistar(true); return; }
    const inicio = Date.now();
    let visto = false;
    const id = window.setInterval(() => {
      const el = aqui() === paso.ruta || Date.now() - inicio > 2500
        ? [...document.querySelectorAll(paso.objetivo!)].find(visible) : undefined;
      if (!el) {
        // Si la pantalla no trae ese bloque, el recorrido no se queda atorado.
        if (Date.now() - inicio > 7000) alistar(true);
        return;
      }
      const r = el.getBoundingClientRect();
      if (!visto) {
        visto = true;
        const holgura = window.innerHeight - r.height;
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (holgura > 320 ? Math.min(holgura / 3, 150) : 84)), behavior: 'smooth' });
        window.setTimeout(() => alistar(true), 500);
      }
      medir(a => a && a.top === r.top && a.left === r.left && a.width === r.width && a.height === r.height ? a
        : { top: r.top, left: r.left, width: r.width, height: r.height });
    }, 120);
    return () => clearInterval(id);
  }, [paso, enRuta]);

  // Paso 2: sube la hoja de ejemplo; después espera lo que diga el motor.
  useEffect(() => {
    if (!paso?.accion || !enRuta || hecho.current === i) return;
    hecho.current = i;
    const e = leer();
    if (!e) return;
    let vivo = true;
    if (paso.accion === 'subir') {
      if (e.trabajo || e.subida) { anotar(e.subida || 'La hoja ya se envió en este recorrido; no se manda otra vez.'); ocupar(false); return; }
      anotar('Enviando jornada-nueva-chapala.xlsx…');
      subirHoja(e).then(({ id, error }) => {
        const nota = id ? 'Hoja recibida. El motor la está leyendo.' : `No se subió: ${error}`;
        const actual = leer();
        if (actual) guardar({ ...actual, trabajo: id, subida: nota });
        window.dispatchEvent(new Event('eira:carga-recibida'));
        if (vivo) { anotar(nota); ocupar(false); }
      });
    } else {
      if (!e.trabajo) { anotar(e.subida || 'No hay una carga de este recorrido que revisar.'); ocupar(false); return; }
      const inicio = Date.now();
      anotar('Leyendo el archivo…');
      const revisar = async () => {
        let frase: string | null = null;
        try {
          const j = await (await fetch(`/api/trabajos?alcance=${PROGRAMA_DEMO}`, { cache: 'no-store' })).json();
          frase = fraseResultado(j.trabajos?.find((t: { id: string }) => t.id === e.trabajo));
        } catch { /* Se reintenta en la siguiente vuelta. */ }
        if (!vivo) return;
        if (frase || Date.now() - inicio > 30000) {
          anotar(frase || 'El archivo sigue en proceso; el Tablero se actualiza solo al terminar.');
          ocupar(false);
        } else window.setTimeout(revisar, 1200);
      };
      revisar();
    }
    return () => { vivo = false; hecho.current = -1; };
  }, [i, paso, enRuta, guardar]);

  // Avance automático.
  const ultimo = i === PASOS.length - 1, ms = reloj.i === i ? reloj.ms : 0;
  const corre = activo && listo && !ocupado && !pausa && !ultimo;
  useEffect(() => {
    if (!corre) return;
    const id = window.setInterval(() => contar(m => m.i === i ? { i, ms: m.ms + 100 } : { i, ms: 100 }), 100);
    return () => clearInterval(id);
  }, [corre, i]);
  useEffect(() => { if (corre && ms >= DURACION) ir(i + 1); }, [corre, ms, i, ir]);

  useEffect(() => {
    if (!activo) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input,select,textarea,[contenteditable]')) return;
      if (e.key === 'ArrowRight' && !ultimo) ir(i + 1);
      else if (e.key === 'ArrowLeft' && i > 0) ir(i - 1);
      else if (e.key === 'Escape') guardar(null);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [activo, i, ultimo, ir, guardar]);

  useLayoutEffect(() => { if (globo.current) altura(globo.current.offsetHeight); });

  if (!activo || !paso || !est) return null;

  // El globo va debajo de lo resaltado, encima si no cabe, o en la esquina si lo resaltado llena la pantalla.
  const vw = window.innerWidth, vh = window.innerHeight, ancho = Math.min(ANCHO, vw - 32);
  let top = Math.max(16, (vh - alto) / 2), left = (vw - ancho) / 2;
  if (caja) {
    left = Math.min(Math.max(16, caja.left), vw - ancho - 16);
    if (vh - (caja.top + caja.height) > alto + 28) top = caja.top + caja.height + 14;
    else if (caja.top > alto + 28) top = caja.top - alto - 14;
    else { top = vh - alto - 20; left = vw - ancho - 20; }
  }
  const reiniciar = () => { navegado.current = -1; hecho.current = -1; guardar({ i: 0, unidad: est.unidad, fechaCorte: est.fechaCorte }); };

  return <div className="demo-guia no-imprimir">
    {caja ? <div className="demo-foco" aria-hidden style={{ top: caja.top - 6, left: caja.left - 6, width: caja.width + 12, height: caja.height + 12 }} />
      : ultimo && <div className="demo-velo" aria-hidden />}
    <aside ref={globo} className="demo-globo" role="dialog" aria-label="Recorrido guiado" style={{ top, left, width: ancho }}>
      <header><span>{etiquetaFase(paso)}</span>
        <button type="button" onClick={() => guardar(null)} aria-label="Salir del recorrido" title="Salir del recorrido"><X size={16} aria-hidden /></button></header>
      <h2>{paso.titulo}</h2>
      <p>{paso.texto}</p>
      {extra && <p className="demo-nota" role="status">{extra}</p>}
      <div className="demo-fases" aria-hidden>{FASES.map((f, n) => <i key={f} data-estado={paso.fase < 0 || n < paso.fase ? 'hecho' : n === paso.fase ? 'actual' : undefined} />)}</div>
      {!ultimo && <div className="demo-avance" aria-hidden><i style={{ width: `${Math.min(100, 100 * ms / DURACION)}%` }} /></div>}
      <footer>{ultimo ? <>
        <button type="button" className="btn btn--secundario btn--sm" onClick={reiniciar}>Repetir</button>
        <button type="button" className="btn btn--primario btn--sm" onClick={() => guardar(null)}>Explorar por mi cuenta</button>
      </> : <>
        <button type="button" className="btn btn--quieto btn--sm" onClick={() => ir(i - 1)} disabled={i === 0}><ChevronLeft size={15} aria-hidden />Anterior</button>
        <button type="button" className="btn btn--secundario btn--sm" onClick={() => pausar(p => !p)} aria-pressed={pausa}>
          {pausa ? <><Play size={14} aria-hidden />Seguir</> : <><Pause size={14} aria-hidden />Pausa</>}</button>
        <button type="button" className="btn btn--primario btn--sm" onClick={() => ir(i + 1)}>Siguiente<ChevronRight size={15} aria-hidden /></button>
      </>}<small>{i + 1} / {PASOS.length}</small></footer>
    </aside>
  </div>;
}

/** Portada de /demo: explica los cuatro pasos y arranca sola. */
export function InicioDemo({ unidad, fechaCorte }: { unidad: string; fechaCorte: string }) {
  const router = useRouter();
  const [seg, bajar] = useState(4);
  const empezar = useCallback(() => {
    escribir({ i: 0, unidad, fechaCorte });
    window.dispatchEvent(new Event(EVENTO));
    router.push(PASOS[0].ruta);
  }, [unidad, fechaCorte, router]);
  useEffect(() => {
    escribir(null);
    window.dispatchEvent(new Event(EVENTO));
    const id = window.setInterval(() => bajar(s => s - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (seg <= 0) empezar(); }, [seg, empezar]);
  return <div className="archivo-eira demo-portada">
    <div className="apertura"><h1>Recorrido guiado</h1>
      <p>Un minuto y medio, sin tocar nada: la plataforma se recorre sola en cuatro pasos. Puedes pausar o avanzar cuando quieras.</p></div>
    <ol>{FASES.map((f, n) => <li key={f}><b>{n + 1}</b><span>{f}</span></li>)}</ol>
    <div className="demo-portada-pie"><button type="button" className="btn btn--primario" onClick={empezar}>Empezar ahora</button>
      <span role="status">{seg > 0 ? `Empieza solo en ${seg} s` : 'Abriendo el Tablero…'}</span></div>
  </div>;
}
