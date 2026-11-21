import './programa-carga.css';

export function AvisoPrograma({ actual, sugerido, cantidad, cambiar, conservar }: {
  actual: string; sugerido: string; cantidad: number; cambiar: () => void; conservar: () => void;
}) {
  return <div className="programa-aviso">
    <p role="status"><strong>Este archivo parece de {sugerido}. ¿Cambiar?</strong></p>
    {cantidad > 1 && <p>El cambio se aplicará a los {cantidad} archivos de esta carga. Si son de programas distintos, súbelos por separado.</p>}
    <div className="programa-acciones">
      <button type="button" className="btn btn--secundario btn--sm" onClick={cambiar}>Cambiar a {sugerido}</button>
      <button type="button" className="btn btn--quieto btn--sm" onClick={conservar}>Conservar {actual}</button>
    </div>
  </div>;
}
