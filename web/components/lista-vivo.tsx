'use client';

import { useEffect, useState } from 'react';
import type { Fuente, Trabajo } from '@/lib/comun';
import { NOMBRE_UNIDAD, type Unidad } from '@/lib/comun';

type Datos = { trabajos: Trabajo[]; fuentes: Fuente[] };

function etiquetaEstado(t: Trabajo): { texto: string; clase: string } {
  if (t.estado === 'pendiente') return { texto: 'Pendiente', clase: 'estado--info' };
  if (t.estado === 'procesando') return { texto: 'Procesando…', clase: 'estado--info' };
  if (t.estado === 'error') return { texto: 'Error', clase: 'estado--error' };
  if (t.estado === 'duplicado') {
    if (t.nivel_duplicado === 'mismo_contenido') return { texto: 'Duplicado: mismo contenido', clase: 'estado--aviso' };
    return { texto: 'Duplicado: idéntico', clase: 'estado--aviso' };
  }
  if (t.estado === 'listo') {
    if (t.nivel_duplicado === 'version_nueva') return { texto: 'Listo: versión nueva', clase: 'estado--aviso' };
    if (t.nivel_duplicado === 'traslape_parcial') return { texto: 'Listo: traslape parcial', clase: 'estado--aviso' };
    return { texto: 'Listo', clase: 'estado--listo' };
  }
  return { texto: t.estado, clase: 'estado--info' };
}

function Estrellas({ n }: { n: number }) {
  const llenas = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span aria-label={`${llenas} de 5 estrellas`} className="mono" role="img">
      {'★'.repeat(llenas)}
      {'☆'.repeat(5 - llenas)}
    </span>
  );
}

export function ListaVivo({ inicial }: { inicial: Datos }) {
  const [datos, setDatos] = useState<Datos>(inicial);
  const [alDia, setAlDia] = useState(true);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/trabajos', { cache: 'no-store' });
        const j = (await r.json()) as { ok: boolean } & Datos;
        if (j.ok) {
          setDatos({ trabajos: j.trabajos, fuentes: j.fuentes });
          setAlDia(true);
        } else setAlDia(false);
      } catch {
        setAlDia(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="t-trabajos">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="t-trabajos">Trabajos</h2>
          <span className="etiqueta" role="status">{alDia ? 'Actualizándose cada 2 s' : 'Sin conexión; se reintenta solo'}</span>
        </div>
        {datos.trabajos.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-cotton)] p-6">
            <p className="font-medium">Todavía no hay trabajos.</p>
            <p className="text-[var(--color-muted)]">Sube un Excel o CSV arriba y aquí verás su estado en cuanto el procesamiento lo tome.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.trabajos.map((t) => {
              const e = etiquetaEstado(t);
              return (
                <li key={t.id} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-cotton)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{t.nombre}</span>
                    <span className={`estado ${e.clase}`}>{e.texto}</span>
                  </div>
                  <p className="etiqueta mt-1">
                    {t.programa} · {NOMBRE_UNIDAD[t.unidad as Unidad] ?? t.unidad} · corte {t.fecha_corte} · {t.por}
                  </p>
                  {t.mensaje && <p className="mt-2">{t.mensaje}</p>}
                  {t.estado === 'listo' && t.filas > 0 && (
                    <p className="etiqueta mt-1 mono">
                      {t.filas} filas · {t.filas_nuevas} nuevas · {t.filas_omitidas} omitidas
                      {t.filas_repetidas > 0 ? ` · ${t.filas_repetidas} repetidas dentro` : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-fuentes">
        <h2 id="t-fuentes" className="mb-3">Archivos ya cargados</h2>
        {datos.fuentes.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-cotton)] p-6">
            <p className="font-medium">Aún no hay archivos importados.</p>
            <p className="text-[var(--color-muted)]">Cuando un trabajo termina bien, su archivo aparece aquí con su calificación.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.fuentes.map((f) => (
              <li key={f.id} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-cotton)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{f.nombre}</span>
                  <Estrellas n={f.estrellas} />
                </div>
                <p className="etiqueta mt-1">
                  {f.programa} · {NOMBRE_UNIDAD[f.unidad as Unidad] ?? f.unidad} · corte {f.fecha_corte} · {f.filas_nuevas} filas nuevas
                </p>
                {f.motivos.length > 0 && (
                  <div className="mt-2">
                    <p className="etiqueta">Qué le falta para subir de calificación:</p>
                    <ul className="mt-1 list-disc pl-5 text-[var(--color-ink-2)]">
                      {f.motivos.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
