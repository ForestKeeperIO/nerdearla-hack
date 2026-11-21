import type { Med } from '@/lib/comun';

/**
 * Desplegable "Cómo se calculó": una frase en español llano con la regla,
 * el denominador y la fuente — nunca comandos crudos de Valkey.
 * `texto` describe la cifra concreta; sin él se usa una explicación genérica.
 */
export function ComoSeCalculo({ med, texto }: { med: Med<unknown>; texto?: string }) {
  return (
    <details className="calculo no-imprimir">
      <summary>Cómo se calculó</summary>
      <div className="calculo__cuerpo">
        <div>{texto ?? 'Conteo exacto leído de la base de datos del proyecto (sin estimaciones ni aproximaciones).'}</div>
        <div>La consulta tardó {med.ms} ms.</div>
      </div>
    </details>
  );
}
