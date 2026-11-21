// Cola de archivos que no se pudieron enviar por falta de conexión. Vive en
// IndexedDB de este navegador; cada llamada tolera que el almacenamiento falle.

export type Pendiente = {
  id: number;
  campos: Record<string, string>;
  archivo: Blob;
  nombre: string;
  tamano: number;
  hora: string;
  error?: string;
};

export const EVENTO_COLA = 'eira:cola';
const BASE = 'eira-cola', ALMACEN = 'pendientes';
const avisar = () => { try { window.dispatchEvent(new Event(EVENTO_COLA)); } catch { /* Sin ventana no hay a quién avisar. */ } };

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const p = indexedDB.open(BASE, 1);
      p.onupgradeneeded = () => p.result.createObjectStore(ALMACEN, { keyPath: 'id', autoIncrement: true });
      p.onsuccess = () => resolve(p.result);
      p.onerror = () => reject(p.error);
    } catch (e) { reject(e); }
  });
}

async function operar<T>(modo: IDBTransactionMode, accion: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const p = accion(db.transaction(ALMACEN, modo).objectStore(ALMACEN));
      p.onsuccess = () => resolve(p.result);
      p.onerror = () => reject(p.error);
    });
  } finally { db.close(); }
}

/** Guarda un archivo para enviarlo después. Devuelve false si el navegador no dejó guardarlo. */
export async function guardarPendiente(archivo: File, campos: Record<string, string>): Promise<boolean> {
  try {
    await operar('readwrite', a => a.add({ campos, archivo, nombre: archivo.name, tamano: archivo.size, hora: new Date().toISOString() }));
    avisar();
    return true;
  } catch { return false; }
}

export async function listarPendientes(): Promise<Pendiente[]> {
  try { return await operar('readonly', a => a.getAll() as IDBRequest<Pendiente[]>); } catch { return []; }
}

export async function quitarPendiente(id: number): Promise<void> {
  try { await operar('readwrite', a => a.delete(id)); } catch { /* Si no se pudo borrar, sigue en la lista. */ }
  avisar();
}

let enCurso: Promise<{ subidos: number; fallidos: number }> | null = null;

/**
 * Envía en orden lo pendiente por la ruta normal. Un corte de red detiene la vuelta
 * y deja todo como estaba; un rechazo del servidor se anota en el archivo.
 * Con `soloId` reintenta también un archivo que el servidor ya había rechazado.
 */
export function procesarCola(soloId?: number): Promise<{ subidos: number; fallidos: number }> {
  enCurso ??= (async () => {
    let subidos = 0, fallidos = 0;
    for (const p of await listarPendientes()) {
      if (soloId !== undefined ? p.id !== soloId : Boolean(p.error)) continue;
      const fd = new FormData();
      fd.set('archivo', new File([p.archivo], p.nombre, { type: p.archivo.type }));
      for (const [k, v] of Object.entries(p.campos)) fd.set(k, v);
      let r: Response;
      try { r = await fetch('/api/subir', { method: 'POST', body: fd }); } catch { break; }
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) {
        await quitarPendiente(p.id);
        subidos++;
        try { window.dispatchEvent(new Event('eira:carga-recibida')); } catch { /* Solo es un aviso. */ }
      } else {
        fallidos++;
        try { await operar('readwrite', a => a.put({ ...p, error: j?.error || 'El servidor no aceptó el archivo.' })); } catch { /* Se reintentará. */ }
        avisar();
      }
    }
    return { subidos, fallidos };
  })().finally(() => { enCurso = null; });
  return enCurso;
}
