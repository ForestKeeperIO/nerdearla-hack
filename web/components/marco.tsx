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
    <div className="archivo-eira expediente-carga">
      <Link href="/subir" className="regreso no-imprimir">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Cambiar programa
      </Link>
      <div className="cab-carga">
        <p>{tituloInforme(estado.alcance)}</p>
        <div className="no-imprimir">
          <IndicadorPasos estado={estado} actual={paso} />
        </div>
      </div>
      <div className="apertura">
        <h1>{titulo}</h1>
        {bajada && <p className="lead mt-3" style={{ maxWidth: '58ch' }}>{bajada}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
