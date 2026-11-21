// Pie de cada paso: "Volver" a la izquierda, acción principal a la derecha.
// Siempre se puede volver; la acción principal solo se habilita cuando el paso está resuelto.
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { pasosDe, rutaPaso, type EstadoRecorrido, type Paso } from '@/lib/recorrido';

export function PieDePaso({
  estado,
  paso,
  children,
}: {
  estado: EstadoRecorrido;
  paso: Paso;
  children?: React.ReactNode;
}) {
  const pasos = pasosDe(estado.alcance);
  const i = pasos.indexOf(paso);
  const anterior = i > 0 ? pasos[i - 1] : null;
  const volver = anterior
    ? { href: rutaPaso(estado.alcance, anterior), texto: 'Volver' }
    : { href: '/subir', texto: 'Cambiar programa' };

  return (
    <footer
      className="no-imprimir"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)',
        marginTop: 'var(--sp-12)', paddingTop: 'var(--sp-6)', borderTop: 'var(--border)',
      }}
    >
      <Link href={volver.href} className="btn btn--quieto">
        <ArrowLeft className="size-4" aria-hidden="true" /> {volver.texto}
      </Link>
      {children}
    </footer>
  );
}
