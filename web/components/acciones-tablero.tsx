'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';

export function AccionesTablero() {
  const ruta = usePathname(), q = useSearchParams().toString(), router = useRouter();
  const [ocupado, start] = useTransition();
  const [minutos, contar] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    contar(0);
    const id = window.setInterval(() => contar(Math.floor((Date.now()-inicio)/60000)),30000);
    return () => clearInterval(id);
  }, [q, ruta, ocupado]);
  if (ruta !== '/tablero') return null;
  return <div className="atlas-acciones">
    <span>{ocupado ? 'Actualizando…' : minutos ? `Actualizado hace ${minutos} min` : 'Actualizado hace un momento'}</span>
    <button type="button" aria-label="Actualizar cifras" title="Actualizar cifras" disabled={ocupado}
      onClick={() => start(() => router.refresh())}><RefreshCw size={16} strokeWidth={1.5} aria-hidden /></button>
    <a className="atlas-accion" href={`/tablero/cifras.csv${q ? `?${q}` : ''}`} download title="Descargar esta selección en CSV">
      <Download size={16} strokeWidth={1.5} aria-hidden />Exportar</a>
  </div>;
}
