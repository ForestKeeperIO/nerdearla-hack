'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isValidFolio, normalizarFolio } from '@/lib/folio';

type NdefReaderCtor = new () => {
  scan(): Promise<void>;
  addEventListener(t: 'reading' | 'readingerror', f: (e: unknown) => void): void;
};

declare global {
  interface Window {
    NDEFReader?: NdefReaderCtor;
  }
}

export function RegistroTarjeta() {
  const [folio, setFolio] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<string | null>(null);

  const limpio = normalizarFolio(folio);
  const valido = folio.trim().length > 0 && isValidFolio(folio);
  const hayNfc = typeof window !== 'undefined' && 'NDEFReader' in window;

  async function acercar() {
    if (!window.NDEFReader) return;
    setLeyendo(true);
    setMensaje('Acerca la tarjeta al lector…');
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.addEventListener('reading', (e: unknown) => {
        const ev = e as { message?: { records?: { recordType: string; data: DataView }[] } };
        for (const r of ev.message?.records ?? []) {
          if (r.recordType === 'text') {
            const texto = new TextDecoder().decode(r.data);
            const m = /EIRA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}/.exec(texto.toUpperCase());
            if (m) {
              setFolio(m[0]);
              setMensaje('Tarjeta leída.');
            } else {
              setMensaje('La tarjeta se leyó pero no trae un folio EIRA.');
            }
          }
        }
        setLeyendo(false);
      });
      ndef.addEventListener('readingerror', () => {
        setMensaje('No se pudo leer la tarjeta; acércala de nuevo o escribe el folio.');
        setLeyendo(false);
      });
    } catch {
      setMensaje('No se pudo abrir el lector de tarjetas en este navegador.');
      setLeyendo(false);
    }
  }

  return (
    <div className="tarjeta max-w-xl">
      <label htmlFor="folio" className="etiqueta">Folio de la tarjeta</label>
      <div className="mt-1 flex flex-wrap gap-3">
        <input
          id="folio"
          value={folio}
          onChange={(e) => {
            setFolio(e.target.value);
            setRegistrado(null);
            setMensaje(null);
          }}
          placeholder="EIRA-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="mono min-w-64 flex-1 rounded-md border border-[var(--color-input)] bg-[var(--color-cotton)] px-3"
          aria-invalid={folio.trim().length > 0 && !valido}
          aria-describedby="folio-ayuda folio-estado"
        />
        <Button
          onClick={() => {
            if (valido) {
              setRegistrado(limpio);
              setMensaje(null);
            }
          }}
          disabled={!valido}
        >
          Registrar
        </Button>
        {hayNfc && (
          <Button variant="outline" onClick={acercar} disabled={leyendo}>
            {leyendo ? 'Esperando tarjeta…' : 'Acercar tarjeta'}
          </Button>
        )}
      </div>
      <p id="folio-ayuda" className="etiqueta mt-2">
        Formato EIRA-XXXX-XXXX con dígito verificador. Es un registro con tarjeta: queda ligado a la
        persona para sus próximas asistencias; no prueba su identidad.
      </p>
      {folio.trim().length > 0 && !valido && (
        <p id="folio-estado" role="alert" className="mt-2 text-[var(--estado-error)]">
          Ese folio no es válido: revisa las letras y el dígito verificador.
        </p>
      )}
      {mensaje && <p role="status" className="mt-2 text-[var(--color-ink-2)]">{mensaje}</p>}
      {registrado && (
        <p role="status" className="estado estado--listo mt-3">
          Folio {registrado} registrado (demostración)
        </p>
      )}
    </div>
  );
}
