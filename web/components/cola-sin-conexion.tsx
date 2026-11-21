'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { EVENTO_COLA, listarPendientes, procesarCola, quitarPendiente, type Pendiente } from '@/lib/cola-sin-conexion';
import { explicarErrorCarga } from '@/lib/error-carga';

const LIMITE = 'Funciona si la página ya estaba abierta cuando se perdió la conexión. Los archivos se guardan solo en este navegador.';

function usePendientes() {
  const [lista, fijar] = useState<Pendiente[]>([]);
  const leer = useCallback(() => { listarPendientes().then(fijar); }, []);
  useEffect(() => {
    leer();
    window.addEventListener(EVENTO_COLA, leer);
    return () => window.removeEventListener(EVENTO_COLA, leer);
  }, [leer]);
  return lista;
}

async function subir(id?: number) {
  const { subidos, fallidos } = await procesarCola(id);
  if (subidos) toast.success(`${subidos} archivo${subidos > 1 ? 's' : ''} guardado${subidos > 1 ? 's' : ''} sin conexión ya se subi${subidos > 1 ? 'eron' : 'ó'}`,
    { description: 'El resultado aparece en la lista de archivos.' });
  if (fallidos) toast.error(`${fallidos} archivo${fallidos > 1 ? 's' : ''} guardado${fallidos > 1 ? 's' : ''} no se aceptó${fallidos > 1 ? 'aron' : ''}`);
}

/** En la cabecera: cuenta lo pendiente y lo envía al cargar cualquier página y al volver la conexión. */
export function InsigniaCola() {
  const lista = usePendientes();
  useEffect(() => {
    const intentar = () => { if (navigator.onLine) subir(); };
    intentar();
    window.addEventListener('online', intentar);
    return () => window.removeEventListener('online', intentar);
  }, []);
  if (!lista.length) return null;
  return <Link href="/subir" className="insignia-cola" title={LIMITE}>
    <CloudOff size={14} aria-hidden />{lista.length} archivo{lista.length > 1 ? 's' : ''} por subir
  </Link>;
}

/** En «Subir archivos»: lo guardado sin conexión, con sus acciones. */
export function ColaSinConexion() {
  const lista = usePendientes();
  const [ocupado, ocupar] = useState<number | null>(null);
  if (!lista.length) return null;
  return <ul className="cola-sin-conexion" aria-label="Archivos guardados sin conexión">
    {lista.map(p => <li key={p.id}>
      <CloudOff size={18} aria-hidden />
      <div>
        <b>{p.nombre}</b> <span className="etiqueta mono">{Math.max(1, Math.round(p.tamano / 1024))} KB</span>
        {p.error
          ? <p role="alert">El servidor no lo aceptó: {explicarErrorCarga(p.error)}</p>
          : <p title={LIMITE}>Sin conexión · guardado en este navegador. Se subirá solo cuando vuelva la conexión.</p>}
      </div>
      <span>
        <button type="button" className="btn btn--secundario btn--sm" disabled={ocupado !== null}
          onClick={async () => { ocupar(p.id); await subir(p.id); ocupar(null); }}>
          {ocupado === p.id ? 'Subiendo…' : p.error ? 'Volver a subir' : 'Subir ahora'}</button>
        <button type="button" className="btn btn--quieto btn--sm" disabled={ocupado !== null} onClick={() => quitarPendiente(p.id)}>Descartar</button>
      </span>
    </li>)}
  </ul>;
}
