'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UNIDADES, NOMBRE_UNIDAD, type Unidad } from '@/lib/comun';

const MAX_BYTES = 10 * 1024 * 1024;

type ArchivoLocal = {
  id: number;
  file: File;
  programa: string;
  unidad: Unidad;
  fechaCorte: string;
  envio: 'sin_enviar' | 'enviando' | 'enviado' | 'error';
  error?: string;
};

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function validar(f: File): string | null {
  const ext = f.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsm') return 'Los .xlsm (con macros) no se aceptan; guarda una copia como .xlsx.';
  if (ext !== 'xlsx' && ext !== 'csv') return 'Solo se aceptan .xlsx o .csv.';
  if (f.size > MAX_BYTES) return `Pesa más de 10 MB (${Math.round(f.size / 1048576)} MB).`;
  return null;
}

export function SubirArchivos({ programas, por }: { programas: string[]; por: string }) {
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const siguiente = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

  function agregar(lista: FileList | File[]) {
    const nuevos: ArchivoLocal[] = [];
    for (const f of Array.from(lista)) {
      const error = validar(f);
      nuevos.push({
        id: siguiente.current++,
        file: f,
        programa: programas[0] ?? '',
        unidad: 'atencion',
        fechaCorte: hoyISO(),
        envio: error ? 'error' : 'sin_enviar',
        error: error ?? undefined,
      });
    }
    setArchivos((a) => [...a, ...nuevos]);
  }

  function cambiar(id: number, campo: Partial<ArchivoLocal>) {
    setArchivos((a) => a.map((x) => (x.id === id ? { ...x, ...campo } : x)));
  }

  async function enviar() {
    const pendientes = archivos.filter((a) => a.envio === 'sin_enviar' && a.programa && a.fechaCorte);
    if (!pendientes.length) return;
    setEnviando(true);
    for (const a of pendientes) {
      cambiar(a.id, { envio: 'enviando' });
      const fd = new FormData();
      fd.set('archivo', a.file);
      fd.set('programa', a.programa);
      fd.set('unidad', a.unidad);
      fd.set('fecha_corte', a.fechaCorte);
      fd.set('por', por);
      try {
        const r = await fetch('/api/subir', { method: 'POST', body: fd });
        const j = (await r.json()) as { ok: boolean; error?: string };
        cambiar(a.id, j.ok ? { envio: 'enviado' } : { envio: 'error', error: j.error ?? 'No se pudo subir.' });
      } catch {
        cambiar(a.id, { envio: 'error', error: 'Sin conexión con el servidor.' });
      }
    }
    setEnviando(false);
  }

  const enviables = archivos.filter((a) => a.envio === 'sin_enviar' && a.programa.trim() && a.fechaCorte).length;

  return (
    <section aria-labelledby="titulo-subir" className="mb-8">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona para arrastrar archivos; activa para elegir archivos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          agregar(e.dataTransfer.files);
        }}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          arrastrando ? 'border-[var(--color-accent-2)] bg-[var(--accent)]' : 'border-[var(--color-rule-2)] bg-[var(--color-cotton)]'
        }`}
      >
        <p className="text-lg font-medium">Arrastra aquí tus archivos .xlsx o .csv</p>
        <p className="text-[var(--color-muted)]">o elige archivos desde tu equipo (máximo 10 MB cada uno)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.csv"
          className="visually-hidden"
          onChange={(e) => {
            if (e.target.files) agregar(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {archivos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {archivos.map((a) => (
            <li key={a.id} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-cotton)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{a.file.name}</span>{' '}
                  <span className="etiqueta">{(a.file.size / 1024).toFixed(0)} KB</span>
                </div>
                {a.envio === 'enviado' && <span className="estado estado--listo">Enviado</span>}
                {a.envio === 'enviando' && <span className="estado estado--info">Enviando…</span>}
                {a.envio === 'error' && <span className="estado estado--error">No se subió</span>}
                {(a.envio === 'sin_enviar' || a.envio === 'error') && (
                  <Button variant="outline" onClick={() => setArchivos((x) => x.filter((y) => y.id !== a.id))}>
                    Quitar
                  </Button>
                )}
              </div>
              {a.error && <p className="mt-2 text-[var(--estado-error)]">{a.error}</p>}
              {a.envio !== 'enviado' && !a.error && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="etiqueta">Programa</span>
                    <input
                      list="programas-conocidos"
                      value={a.programa}
                      onChange={(e) => cambiar(a.id, { programa: e.target.value })}
                      className="rounded-md border border-[var(--color-input)] bg-[var(--color-cotton)] px-3"
                      placeholder="Nombre del programa"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="etiqueta">Unidad</span>
                    <select
                      value={a.unidad}
                      onChange={(e) => cambiar(a.id, { unidad: e.target.value as Unidad })}
                      className="rounded-md border border-[var(--color-input)] bg-[var(--color-cotton)] px-3"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {NOMBRE_UNIDAD[u]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="etiqueta">Fecha de corte</span>
                    <input
                      type="date"
                      value={a.fechaCorte}
                      onChange={(e) => cambiar(a.id, { fechaCorte: e.target.value })}
                      className="rounded-md border border-[var(--color-input)] bg-[var(--color-cotton)] px-3"
                    />
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <datalist id="programas-conocidos">
        {programas.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {archivos.some((a) => a.envio === 'sin_enviar') && (
        <div className="mt-4">
          <Button onClick={enviar} disabled={enviando || enviables === 0} size="lg">
            {enviando ? 'Enviando…' : enviables ? `Subir ${enviables} archivo${enviables > 1 ? 's' : ''}` : 'Completa programa y fecha de corte'}
          </Button>
        </div>
      )}
    </section>
  );
}
