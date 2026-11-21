import { useEffect } from 'react';

type Borrador = { file: File; estado: string };
// Solo durante la navegación entre programas en esta pestaña; nunca al almacenamiento del navegador.
let traslado: { destino: string; borradores: Borrador[] } | null = null;

export function prepararTraslado(destino: string, archivos: Borrador[]) {
  traslado = { destino, borradores: archivos.map(({ file, estado }) => ({ file, estado })) };
}

export function useRecibirTraslado(destino: string, agregar: (files: File[], rechazados: [], estados: string[]) => void) {
  useEffect(() => {
    if (traslado?.destino !== destino) return;
    const { borradores } = traslado;
    traslado = null;
    agregar(borradores.map(a => a.file), [], borradores.map(a => a.estado));
  }, [destino, agregar]);
}
