'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" style={{ maxWidth: '56ch', margin: '0 auto', textAlign: 'center', paddingBlock: 'var(--sp-12)' }}>
      <h1>Algo salió mal</h1>
      <p className="lead mt-3" style={{ color: 'var(--tinta-suave)' }}>
        No se pudo cargar esta pantalla. Inténtalo de nuevo; si sigue fallando, vuelve al Tablero.
      </p>
      <div className="mt-6" style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
        <button type="button" className="btn btn--primario" onClick={reset}>Intentar de nuevo</button>
        <Link href="/tablero" className="btn btn--secundario no-underline">Ir al Tablero</Link>
      </div>
    </div>
  );
}
