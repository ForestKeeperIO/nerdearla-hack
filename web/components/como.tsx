import type { Med } from '@/lib/comun';

/** Desplegable "Cómo se calculó": el comando de Valkey y los milisegundos. */
export function ComoSeCalculo({ med }: { med: Med<unknown> }) {
  return (
    <details className="calculo no-imprimir">
      <summary>Cómo se calculó</summary>
      <div className="calculo__cuerpo">
        <div>{med.comando}</div>
        <div>{med.ms} ms en Valkey</div>
      </div>
    </details>
  );
}
