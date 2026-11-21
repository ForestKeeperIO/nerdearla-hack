import { RegistroTarjeta } from '@/components/registro';

export const dynamic = 'force-dynamic';

export default function PaginaRegistro() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="max-w-none">Registro con tarjeta</h1>
        <p className="lead mt-2">
          Liga el folio de una tarjeta a la persona para que sus próximas asistencias entren con folio.
          También puedes escribir el folio a mano si el equipo no tiene lector.
        </p>
      </div>
      <RegistroTarjeta />
    </div>
  );
}
