'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { FileSpreadsheet, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Selector } from './selector';
import type { Opcion } from '@/lib/filtros-comun';

const MAX_BYTES = 10 * 1024 * 1024;

export type TipoOpcion = { clave: string; etiqueta: string };
export type EstadoOpcion = { clave: string; nombre: string };

type ArchivoLocal = {
  id: number;
  file: File;
  unidad: string;
  estado: string;
  envio: 'sin_enviar' | 'enviando' | 'error';
  progreso?: number;
  error?: string;
};

function textoError(r: FileRejection): string {
  const codigo = r.errors[0]?.code;
  if (codigo === 'file-too-large') return `Pesa más de 10 MB (${Math.round(r.file.size / 1048576)} MB).`;
  if (codigo === 'file-invalid-type') return 'Solo se aceptan .xlsx o .csv.';
  return 'No se acepta este archivo. Elige un Excel (.xlsx) o un CSV.';
}

function transferir(datos:FormData, progreso:(porcentaje:number)=>void) {
  return new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST','/api/subir');
    xhr.responseType='json';
    xhr.timeout=120000;
    xhr.upload.onprogress=e=>{if(e.lengthComputable && e.total) progreso(Math.round(100*e.loaded/e.total));};
    xhr.onload=()=>xhr.status>=200 && xhr.status<300 && xhr.response?.ok ? resolve()
      : reject(new Error(xhr.response?.error || 'El servidor no confirmó la recepción. Revisa la lista antes de reintentar.'));
    xhr.onerror=xhr.ontimeout=()=>reject(new Error('No se confirmó el envío. Revisa la conexión y la lista de archivos.'));
    xhr.send(datos);
  });
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
  programas,
  lectura=false,
}: {
  alcance: string;
  tipos: TipoOpcion[];
  fechaCorte: string;
  estados: EstadoOpcion[];
  programas: Opcion[];
  lectura?: boolean;
}) {
  const router=useRouter();
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
    disabled: lectura,
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
    if (!pendientes.length || enviando || lectura) return;
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
        await transferir(fd,progreso=>cambiar(a.id,{progreso}));
        setArchivos(actual=>actual.filter(x=>x.id!==a.id));
        window.dispatchEvent(new Event('eira:carga-recibida'));
        bien++;
      } catch (error) {
        cambiar(a.id, { envio: 'error', error: error instanceof Error?error.message:'No se pudo subir el archivo.' });
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
        {...getRootProps({className:'zona-carga'})}
        data-arrastrando={isDragActive} aria-disabled={lectura}
      >
        <input {...getInputProps({'aria-label':'Archivo Excel o CSV'})} disabled={lectura} />
        <UploadCloud aria-hidden="true" />
        <p aria-live="polite">
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra aquí los Excel o CSV de este programa'}
        </p>
        <button type="button" onClick={open} disabled={lectura} className="elegir-archivo">Elegir archivo</button>
        <small>{lectura?'Modo de consulta: no se reciben archivos.':'Excel (.xlsx) o CSV · Hasta 10 MB por archivo'}</small>
      </div>
      <div className="programa-subida">{archivos.length || enviando
        ? <p>Programa de esta carga: <strong>{programas.find(p=>p.valor===alcance)?.texto}</strong></p>
        : <Selector unico label="Programa" opciones={programas} elegidos={[alcance]} cambiar={([id])=>{
            if(id && id!==alcance) router.push(`/informe/${encodeURIComponent(id)}/subir`);
          }}/>}</div>

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
                {a.envio === 'enviando' && <span className="transferencia" role="status">Subiendo{a.progreso===undefined?'…':` · ${a.progreso} %`}
                  <progress aria-label={`Progreso de ${a.file.name}`} max={100} value={a.progreso}/></span>}
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
