import { listarFuentes, listarTrabajos, valoresDe } from '@/lib/datos';
import { SubirArchivos } from '@/components/subir';
import { ListaVivo } from '@/components/lista-vivo';
import { rolActual } from '@/lib/rol';

export const dynamic = 'force-dynamic';

export default async function PaginaSubir() {
  const [programas, trabajos, fuentes, rol] = await Promise.all([
    valoresDe('programa'),
    listarTrabajos(),
    listarFuentes(),
    rolActual(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="max-w-none">Subir archivos</h1>
        <p className="lead mt-2">
          Sube el Excel o CSV de cada coordinación. Se guarda en Valkey durante una hora para que el
          procesamiento lo lea; si el mismo archivo, una fila o una persona ya estaban, no se cuentan dos veces.
        </p>
      </div>

      <SubirArchivos programas={programas.valor} por={rol === 'presidencia' ? 'Presidencia' : 'Coordinación'} />

      <ListaVivo inicial={{ trabajos: trabajos.valor, fuentes: fuentes.valor }} />
    </div>
  );
}
