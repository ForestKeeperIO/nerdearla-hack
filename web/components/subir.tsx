'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { FileSpreadsheet, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Selector } from './selector';

const MAX_BYTES = 10 * 1024 * 1024;

export type TipoOpcion = { clave: string; etiqueta: string };
export type EstadoOpcion = { clave: string; nombre: string };

type ArchivoLocal = {
  id: number;
  file: File;
  unidad: string;
  estado: string;
  envio: 'sin_enviar' | 'enviando' | 'enviado' | 'error';
  error?: string;
};

function textoError(r: FileRejection): string {
  const codigo = r.errors[0]?.code;
  if (codigo === 'file-too-large') return `Pesa más de 10 MB (${Math.round(r.file.size / 1048576)} MB).`;
  if (codigo === 'file-invalid-type') return 'Solo se aceptan .xlsx o .csv.';
  return r.errors[0]?.message ?? 'No se acepta este archivo.';
}

/** Propone el tipo de registro cuando el nombre del archivo lo sugiere. */
function tipoSugerido(nombre: string, tipos: TipoOpcion[]): string {
  const n = nombre.toLowerCase();
  for (const t of tipos) {
    if (n.includes(t.clave.replace('_', ' ')) || n.includes(t.clave) || n.includes(t.etiqueta.toLowerCase())) {
      return t.clave;
    }
  }
  return tipos[0]?.clave ?? '';
}

export function SubirArchivos({
  alcance,
  tipos,
  fechaCorte,
  estados,
}: {
  alcance: string;
  tipos: TipoOpcion[];
  fechaCorte: string;
  estados: EstadoOpcion[];
}) {
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const siguiente = useRef(1);

  const agregar = useCallback((aceptados: File[], rechazados: FileRejection[]) => {
    const nuevos: ArchivoLocal[] = aceptados.map((f) => ({
      id: siguiente.current++,
      file: f,
      unidad: tipoSugerido(f.name, tipos),
      estado: '14',
      envio: 'sin_enviar',
    }));
    for (const r of rechazados) {
      nuevos.push({
        id: siguiente.current++,
        file: r.file,
        unidad: tipos[0]?.clave ?? '',
        estado: '14',
        envio: 'error',
        error: textoError(r),
      });
    }
    if (nuevos.length) setArchivos((a) => [...a, ...nuevos]);
  }, [tipos]);

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
    const pendientes = archivos.filter((a) => a.envio === 'sin_enviar' && a.unidad);
    if (!pendientes.length) return;
    setEnviando(true);
    let bien = 0;
    let mal = 0;
    for (const a of pendientes) {
      cambiar(a.id, { envio: 'enviando' });
      const fd = new FormData();
      fd.set('archivo', a.file);
      fd.set('programa', alcance);
      fd.set('unidad', a.unidad);
      fd.set('estado_clave', a.estado);
      fd.set('fecha_corte', fechaCorte);
      fd.set('por', 'Presidencia');
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
    if (bien) toast.success(`${bien} archivo${bien > 1 ? 's' : ''} recibido${bien > 1 ? 's' : ''}`, { description: 'Se están leyendo; en unos segundos ves el resultado aquí.' });
    if (mal) toast.error(`${mal} archivo${mal > 1 ? 's' : ''} no se pudo${mal > 1 ? 'n' : ''} subir`);
  }

  const enviables = archivos.filter((a) => a.envio === 'sin_enviar' && a.unidad).length;

  return (
    <section aria-label="Subir archivos">
      <div
        {...getRootProps({
          className: 'tarjeta',
          style: {
            borderStyle: 'dashed', borderWidth: 1, borderColor: isDragActive ? 'var(--vino)' : 'var(--linea-fuerte)',
            minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 'var(--sp-2)', textAlign: 'center', cursor: 'pointer', background: 'var(--superficie)',
          } as React.CSSProperties,
        })}
      >
        <input {...getInputProps()} />
        <UploadCloud className="size-7" style={{ color: 'var(--tinta-tenue)' }} aria-hidden="true" />
        <p style={{ fontWeight: 500 }}>
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra aquí los Excel o CSV de este programa'}
        </p>
        <p className="etiqueta">
          o{' '}
          <button type="button" onClick={open} className="underline underline-offset-4" style={{ color: 'var(--vino)', minHeight: 'auto', fontWeight: 500 }}>
            elige archivos
          </button>{' '}
          (máximo 10 MB cada uno)
        </p>
      </div>

      {archivos.length > 0 && (
        <ul className="mt-4" style={{ listStyle: 'none', padding: 0 }}>
          {archivos.map((a) => (
            <li key={a.id} className="fila" style={{ gap: 'var(--sp-4)' }}>
              <FileSpreadsheet className="size-5" style={{ color: 'var(--tinta-tenue)', flexShrink: 0 }} aria-hidden="true" />
              <span className="fila__cuerpo" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file.name}</span>
                  <span className="etiqueta mono">{(a.file.size / 1024).toFixed(0)} KB</span>
                  {a.error && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--error)', fontSize: 'var(--fs-small)', marginTop: 2 }}>
                      <XCircle className="size-3.5" aria-hidden="true" /> {a.error}
                    </span>
                  )}
                </span>
                {a.envio === 'sin_enviar' && <span className="archivo-selectores">
                  <Selector unico label="Estado de las ciudades" elegidos={[a.estado]} cambiar={([estado]) => cambiar(a.id,{estado})}
                    opciones={estados.map(s => ({valor:s.clave,texto:s.nombre}))} />
                  <Selector unico label="Tipo de registro" elegidos={[a.unidad]} cambiar={([unidad]) => cambiar(a.id,{unidad})}
                    opciones={tipos.map(t => ({valor:t.clave,texto:t.etiqueta}))} />
                </span>}
              </span>
              <span className="fila__dato" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                {a.envio === 'enviado' && <span className="estado estado--listo">Recibido</span>}
                {a.envio === 'enviando' && <span className="estado estado--info">Enviando…</span>}
                {a.envio === 'error' && <span className="estado estado--error">No se subió</span>}
                {(a.envio === 'sin_enviar' || a.envio === 'error') && (
                  <button type="button" className="btn btn--quieto btn--sm" onClick={() => setArchivos((x) => x.filter((y) => y.id !== a.id))}>
                    <Trash2 className="size-4" aria-hidden="true" /> Quitar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {archivos.some((a) => a.envio === 'sin_enviar') && (
        <div className="mt-4">
          <button type="button" className="btn btn--primario" onClick={enviar} disabled={enviando || enviables === 0}>
            {enviando ? 'Enviando…' : `Subir ${enviables} archivo${enviables > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </section>
  );
}
