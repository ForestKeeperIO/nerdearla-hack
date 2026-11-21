'use client';

export function BotonImprimir() {
  return (
    <button type="button" className="btn btn--primario" onClick={() => window.print()}>
      Imprimir o guardar PDF
    </button>
  );
}
