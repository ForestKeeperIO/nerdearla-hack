// Marco de una pantalla de paso: volver a los informes, título del informe,
// indicador de pasos y el contenido. Sin barra lateral ni segunda navegación.
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { IndicadorPasos } from '@/components/pasos';
import { tituloInforme } from '@/lib/informe';
import type { EstadoRecorrido, Paso } from '@/lib/recorrido';

export function MarcoInforme({
  estado,
  paso,
  titulo,
  bajada,
  children,
}: {
  estado: EstadoRecorrido;
  paso: Paso;
  titulo: string;
  bajada?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Link href="/informe" className="etiqueta no-imprimir inline-flex items-center gap-1.5 no-underline hover:underline" style={{ color: 'var(--tinta-tenue)' }}>
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Todos los informes
      </Link>
      <div className="mt-6">
        <p className="etiqueta mono">{tituloInforme(estado.alcance)}</p>
        <div className="mt-4 no-imprimir">
          <IndicadorPasos estado={estado} actual={paso} />
        </div>
      </div>
      <div className="mt-10">
        <h1>{titulo}</h1>
        {bajada && <p className="lead mt-3" style={{ maxWidth: '58ch' }}>{bajada}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
