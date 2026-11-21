'use client';

import { useEffect, useRef, useState } from 'react';

const VISTO = 'eira-gracias-visto', INICIO = 'eira-gracias-inicio', ESPERA = 45000;
const leer = (a: Storage, k: string) => { try { return a.getItem(k); } catch { return null; } };
const guardar = (a: Storage, k: string, v: string) => { try { a.setItem(k, v); } catch { /* Sin almacenamiento: se muestra una vez por carga. */ } };
/** El recorrido guiado no se interrumpe: se espera a que termine o se cierre. */
const enRecorrido = () => window.location.pathname === '/demo' || Boolean(leer(window.sessionStorage, 'eira-demo'));

/** Agradecimiento para jurado y evaluadores: una vez por navegador, a los 45 s de sesión. */
export function GraciasJurado() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierto, abrir] = useState(false);

  useEffect(() => {
    if (leer(window.localStorage, VISTO)) return;
    let inicio = Number(leer(window.sessionStorage, INICIO));
    if (!inicio) { inicio = Date.now(); guardar(window.sessionStorage, INICIO, String(inicio)); }
    const id = window.setInterval(() => {
      if (Date.now() - inicio < ESPERA || enRecorrido() || document.querySelector('dialog[open]')) return;
      window.clearInterval(id);
      guardar(window.localStorage, VISTO, '1');
      abrir(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (abierto && d && !d.open) d.showModal();
  }, [abierto]);

  if (!abierto) return null;
  const cerrar = () => dialogo.current?.close();
  return <dialog ref={dialogo} className="gracias-jurado no-imprimir" aria-labelledby="gracias-titulo" onClose={() => abrir(false)}
    onClick={e => { if (e.target === dialogo.current) cerrar(); }}>
    <h2 id="gracias-titulo">Gracias por evaluarnos</h2>
    <p>Gracias por dedicar su tiempo a revisar Informes que unen. Lo construimos en un día con EIRA Movimiento Rosa A.C. para que cada programa sume sus registros sin contar dos veces a la misma persona.</p>
    <p>Si quieren probarlo: suban un archivo en «Subir archivos» y miren cómo cambian el Tablero y los reportes.</p>
    <p className="gracias-firma">— Equipo Informes que unen</p>
    <footer>
      <button type="button" className="btn btn--quieto btn--sm" onClick={cerrar}>Cerrar</button>
      <button type="button" className="btn btn--primario btn--sm" onClick={cerrar} autoFocus>Seguir explorando</button>
    </footer>
  </dialog>;
}
