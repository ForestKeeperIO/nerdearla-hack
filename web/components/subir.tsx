'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { FileSpreadsheet, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
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

function textoError(r: FileRejection): string {
  const codigo = r.errors[0]?.code;
  if (codigo === 'file-too-large') return `Pesa más de 10 MB (${Math.round(r.file.size / 1048576)} MB).`;
  if (codigo === 'file-invalid-type') return 'Solo se aceptan .xlsx o .csv.';
  return r.errors[0]?.message ?? 'No se acepta este archivo.';
}

export function SubirArchivos({ programas, por }: { programas: string[]; por: string }) {
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const siguiente = useRef(1);

  const agregar = useCallback((aceptados: File[], rechazados: FileRejection[]) => {
    const nuevos: ArchivoLocal[] = aceptados.map((f) => ({
      id: siguiente.current++,
      file: f,
      programa: programas[0] ?? '',
      unidad: 'atencion',
      fechaCorte: hoyISO(),
      envio: 'sin_enviar',
    }));
    for (const r of rechazados) {
      nuevos.push({
        id: siguiente.current++,
        file: r.file,
        programa: '',
        unidad: 'atencion',
        fechaCorte: hoyISO(),
        envio: 'error',
        error: textoError(r),
      });
    }
    if (nuevos.length) setArchivos((a) => [...a, ...nuevos]);
  }, [programas]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: agregar,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxSize: MAX_BYTES,
    noClick: true,
    noKeyboard: true,
  });

  function cambiar(id: number, campo: Partial<ArchivoLocal>) {
    setArchivos((a) => a.map((x) => (x.id === id ? { ...x, ...campo } : x)));
  }

  async function enviar() {
    const pendientes = archivos.filter((a) => a.envio === 'sin_enviar' && a.programa && a.fechaCorte);
    if (!pendientes.length) return;
    setEnviando(true);
    let bien = 0;
    let mal = 0;
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
        if (j.ok) {
          cambiar(a.id, { envio: 'enviado' });
          bien++;
        } else {
          cambiar(a.id, { envio: 'error', error: j.error ?? 'No se pudo subir.' });
          mal++;
        }
      } catch {
        cambiar(a.id, { envio: 'error', error: 'Sin conexión con el servidor.' });
        mal++;
      }
    }
    setEnviando(false);
    if (bien) toast.success(`${bien} archivo${bien > 1 ? 's' : ''} en cola`, { description: 'El procesamiento los toma de Valkey en unos segundos.' });
    if (mal) toast.error(`${mal} archivo${mal > 1 ? 's' : ''} no se pudo${mal > 1 ? 'n' : ''} subir`);
  }

  const enviables = archivos.filter((a) => a.envio === 'sin_enviar' && a.programa.trim() && a.fechaCorte).length;

  return (
    <section aria-labelledby="titulo-subir" className="mb-8">
      <div
        {...getRootProps({
          className: `flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-accent' : 'border-input bg-card hover:border-primary/50'
          }`,
        })}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-medium">
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra aquí tus archivos .xlsx o .csv'}
        </p>
        <p className="text-muted-foreground">
          o{' '}
          <button type="button" onClick={open} className="min-h-11 whitespace-nowrap font-medium text-primary underline underline-offset-4">
            elige archivos
          </button>{' '}
          (máximo 10 MB cada uno)
        </p>
      </div>

      {archivos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {archivos.map((a) => (
            <li key={a.id} className="tarjeta flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <FileSpreadsheet className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.file.name}</p>
                    <p className="etiqueta tabular-nums">{(a.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                {a.envio === 'enviado' && <span className="estado estado--listo">Enviado</span>}
                {a.envio === 'enviando' && <span className="estado estado--info">Enviando…</span>}
                {a.envio === 'error' && <span className="estado estado--error">No se subió</span>}
                {(a.envio === 'sin_enviar' || a.envio === 'error') && (
                  <Button variant="outline" size="sm" onClick={() => setArchivos((x) => x.filter((y) => y.id !== a.id))}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Quitar
                  </Button>
                )}
              </div>
              {a.error && (
                <p className="flex items-center gap-2 text-[var(--estado-error)]">
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                  {a.error}
                </p>
              )}
              {a.envio !== 'enviado' && !a.error && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="etiqueta">Programa</span>
                    <input
                      list="programas-conocidos"
                      value={a.programa}
                      onChange={(e) => cambiar(a.id, { programa: e.target.value })}
                      className="rounded-md border border-input bg-card px-3"
                      placeholder="Nombre del programa"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="etiqueta">Unidad</span>
                    <select
                      value={a.unidad}
                      onChange={(e) => cambiar(a.id, { unidad: e.target.value as Unidad })}
                      className="rounded-md border border-input bg-card px-3"
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
                      className="rounded-md border border-input bg-card px-3"
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
          <Button onClick={enviar} disabled={enviando || enviables === 0} size="lg" className="h-11 px-5 text-base">
            {enviando ? 'Enviando…' : enviables ? `Subir ${enviables} archivo${enviables > 1 ? 's' : ''}` : 'Completa programa y fecha de corte'}
          </Button>
        </div>
      )}
    </section>
  );
}
