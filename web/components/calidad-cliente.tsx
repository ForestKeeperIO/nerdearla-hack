'use client';

// Calidad, parte interactiva: las decisiones "¿es la misma persona?" y el pie
// comparten el conteo de pendientes EN ESTA SESIÓN. Las decisiones viajan al
// Stream eira:decisiones y las aplica el procesador, así que el servidor no
// sabe cuántas ya decidió la usuaria; el estado vive aquí (defecto conocido:
// el pie quedaba diciendo "Continuar con 3 por decidir" tras decidir todo).
import { ParesMasa } from './pares-masa';
import { PieDePaso } from './pie-de-paso';
import type { Par } from '@/lib/comun';
import type { EstadoRecorrido } from '@/lib/recorrido';

export function CalidadCliente({
  alcance,
  pares,
  nombreFuente,
  estado,
  accion,
}: {
  alcance: string;
  pares: Par[];
  nombreFuente: Record<string, string>;
  estado: EstadoRecorrido;
  accion: () => Promise<void>;
}) {
  const restantes = pares.filter((p) => p.estado === 'pendiente').length;

  return (
    <>
      <section aria-label="Decisiones pendientes" className="tarjeta">
        <h2>Pares por decidir</h2>
        <ParesMasa
          alcance={alcance}
          pares={pares}
          nombreFuente={nombreFuente}
        />
      </section>
      <PieDePaso estado={estado} paso="calidad">
        <form action={accion} style={{ textAlign: 'right' }}>
          <button type="submit" className="btn btn--primario">
            {restantes > 0 ? `Continuar con ${restantes} por decidir` : 'Continuar a Vista previa'}
          </button>
          {restantes > 0 && (
            <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
              Cada par sin decidir cuenta como una sola persona.
            </p>
          )}
        </form>
      </PieDePaso>
    </>
  );
}
