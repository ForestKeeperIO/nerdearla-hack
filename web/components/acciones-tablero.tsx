'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, Download, RefreshCw } from 'lucide-react';
import { consultaDe, seleccionDe } from '@/lib/seleccion-tablero';

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
  const params = new URLSearchParams(q);
  const canonica = consultaDe(seleccionDe(Object.fromEntries([...new Set(params.keys())].map(k => [k,params.getAll(k).join(',')]))));
  const destino = canonica ? `?${canonica}` : '';
  return <div className="atlas-acciones">
    <span>{ocupado ? 'Actualizando…' : minutos ? `Actualizado hace ${minutos} min` : 'Actualizado hace un momento'}</span>
    <button type="button" aria-label="Actualizar cifras" title="Actualizar cifras" disabled={ocupado}
      onClick={() => start(() => router.refresh())}><RefreshCw size={16} strokeWidth={1.5} aria-hidden /></button>
    <a className="bento-csv" href={`/tablero/cifras.csv${destino}`} download title="Descargar esta selección en CSV" aria-label="Exportar">
      <Download size={16} strokeWidth={1.5} aria-hidden /><span>Exportar</span></a>
    <Link className="atlas-accion" href={`/reportes${destino}`} prefetch={false}>Sacar reporte <ArrowUpRight size={16} aria-hidden /></Link>
  </div>;
}
