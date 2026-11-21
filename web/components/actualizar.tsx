'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function Actualizar({ consulta }: { consulta: number }) {
  const router = useRouter();
  const [ahora, setAhora] = useState(consulta);
  const [ocupado, start] = useTransition();
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(reloj);
  }, []);
  const minutos = Math.max(0, Math.floor((ahora - consulta) / 60_000));
  return <div className="mesa-actualizar">
    <span>{minutos ? `Actualizado hace ${minutos} min` : 'Actualizado hace un momento'}</span>
    <button type="button" aria-label="Actualizar cifras" title="Actualizar cifras" disabled={ocupado}
      onClick={() => start(() => router.refresh())}><RefreshCw size={16} aria-hidden /></button>
  </div>;
}
