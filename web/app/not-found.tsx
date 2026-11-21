import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div style={{ maxWidth: '56ch', margin: '0 auto', textAlign: 'center', paddingBlock: 'var(--sp-12)' }}>
      <p className="etiqueta mono">Error 404</p>
      <h1 className="mt-3">Esta página no existe</h1>
      <p className="lead mt-3" style={{ color: 'var(--tinta-suave)' }}>
        Puede que el informe se haya movido o que la dirección tenga un error.
      </p>
      <div className="mt-6" style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
        <Link href="/tablero" className="btn btn--primario no-underline">Ir al Tablero</Link>
        <Link href="/informe" className="btn btn--secundario no-underline">Ver informes</Link>
      </div>
    </div>
  );
}
