'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet } from 'lucide-react';
import type { Fuente, Trabajo } from '@/lib/comun';
import { StarRating } from '@/components/ui/star-rating';

type Datos = { trabajos: Trabajo[]; fuentes: Fuente[] };

function estadoTrabajo(t: Trabajo): { texto: string; clase: string } {
  if (t.estado === 'pendiente') return { texto: 'En espera', clase: 'estado--info' };
  if (t.estado === 'procesando') return { texto: 'Leyendo…', clase: 'estado--info' };
  if (t.estado === 'error') return { texto: 'No se pudo leer', clase: 'estado--error' };
  if (t.estado === 'duplicado') {
    if (t.nivel_duplicado === 'mismo_contenido') return { texto: 'Ya se cargó (mismo contenido)', clase: 'estado--aviso' };
    return { texto: 'Ya se cargó', clase: 'estado--aviso' };
  }
  if (t.estado === 'listo') {
    if (t.nivel_duplicado === 'version_nueva') return { texto: 'Versión nueva', clase: 'estado--aviso' };
    if (t.nivel_duplicado === 'traslape_parcial') return { texto: 'Listo, con filas ya contadas', clase: 'estado--aviso' };
    return { texto: 'Listo', clase: 'estado--listo' };
  }
  return { texto: t.estado, clase: 'estado--info' };
}

/** Lista en vivo de trabajos y archivos importados del informe (cada 2 s). */
export function ListaVivo({ alcance, inicial }: { alcance: string; inicial: Datos }) {
  const [datos, setDatos] = useState<Datos>(inicial);
  const [alDia, setAlDia] = useState(true);
  const router = useRouter();
  const firma = (d: Datos) => JSON.stringify([d.fuentes.map(f=>f.id), d.trabajos.map(t=>[t.id,t.estado])]);
  const version = useRef(firma(inicial));

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/trabajos?alcance=${encodeURIComponent(alcance)}`, { cache: 'no-store' });
        const j = (await r.json()) as { ok: boolean } & Datos;
        if (j.ok) {
          setDatos({ trabajos: j.trabajos, fuentes: j.fuentes });
          const nueva = firma(j);
          if (version.current !== nueva) {
            version.current = nueva;
            router.refresh();
          }
          setAlDia(true);
        } else setAlDia(false);
      } catch {
        setAlDia(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [alcance,router]);

  const vacio = datos.trabajos.length === 0 && datos.fuentes.length === 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 'var(--sp-2)' }}>
        <h2 style={{ fontSize: 16 }}>Archivos</h2>
        <span className="etiqueta" role="status">{alDia ? 'Se actualiza solo' : 'Sin conexión; se reintenta solo'}</span>
      </div>
      {vacio ? (
        <p className="etiqueta" style={{ borderTop: 'var(--border)', paddingTop: 'var(--sp-4)' }}>
          Todavía no hay archivos. Cuando subas uno, aquí verás cómo va.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {/* Un trabajo ya importado también es fuente: no lo listamos dos veces. */}
          {datos.trabajos
            .filter((t) => !(t.estado === 'listo' && datos.fuentes.some((f) => f.id === t.fuente)))
            .map((t) => {
            const e = estadoTrabajo(t);
            return (
              <li key={t.id} className="fila">
                <FileSpreadsheet className="size-5" style={{ color: 'var(--tinta-tenue)', flexShrink: 0 }} aria-hidden="true" />
                <span className="fila__cuerpo">
                  <span style={{ display: 'block', fontWeight: 500 }}>{t.nombre}</span>
                  {t.mensaje && <span className="etiqueta" style={{ display: 'block' }}>{t.mensaje}</span>}
                </span>
                <span className="fila__dato"><span className={`estado ${e.clase}`}>{e.texto}</span></span>
              </li>
            );
          })}
          {datos.fuentes.map((f) => (
            <li key={f.id} className="fila">
              <FileSpreadsheet className="size-5" style={{ color: 'var(--tinta-tenue)', flexShrink: 0 }} aria-hidden="true" />
              <span className="fila__cuerpo">
                <span style={{ display: 'block', fontWeight: 500 }}>{f.nombre}</span>
                <span className="etiqueta" style={{ display: 'block' }}>
                  {f.filas_nuevas} filas contadas{f.filas_omitidas > 0 ? `, ${f.filas_omitidas} ya estaban` : ''}
                </span>
              </span>
              <span className="fila__dato"><StarRating valor={f.estrellas} etiqueta={`${f.estrellas} / 5`} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
