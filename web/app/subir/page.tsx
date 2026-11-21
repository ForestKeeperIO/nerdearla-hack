import { CargaPrograma } from '@/components/carga-programa';
import { informesActivos } from '@/lib/catalogo';

export const dynamic = 'force-dynamic';

export default function Cargas() {
  const programas=informesActivos();
  const inicio=programas.find(p=>p.id==='tamizaje-rosa') ?? programas[0];
  return inicio ? <CargaPrograma programa={inicio.id}/> : <p>No hay programas habilitados para recibir archivos.</p>;
}
