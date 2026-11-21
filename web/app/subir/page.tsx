import { ElegirProgramaCarga } from '@/components/elegir-programa-carga';
import { SubirArchivos } from '@/components/subir';
import { Toaster } from '@/components/ui/sonner';
import { informesActivos, pluralTipo } from '@/lib/catalogo';
import { soloLectura } from '@/lib/modo-carga';
import { UNIDADES_LIBRES } from '@/lib/programa-libre';
import { estadosCatalogo } from '@/lib/territorio';

export const dynamic = 'force-dynamic';

export default async function Cargas({searchParams}: PageProps<'/subir'>) {
  const programas=informesActivos();
  if ((await searchParams).otro === '1') return <div className="archivo-eira expediente-carga">
    <div className="apertura"><h1>Otro programa</h1><p>Indica qué programa organizó la actividad y qué cuenta cada fila.</p></div>
    <SubirArchivos alcance="otro" fechaCorte={new Date().toISOString().slice(0,10)} estados={estadosCatalogo()}
      tipos={UNIDADES_LIBRES.map(clave=>({clave,etiqueta:pluralTipo(clave)}))}
      programas={programas.filter(p=>p.clase!=='fuente_publica').map(({id,nombre,tipos_de_registro})=>({id,nombre,tipos_de_registro}))} lectura={soloLectura()}/>
    <Toaster position="bottom-right"/>
  </div>;
  return <ElegirProgramaCarga programas={programas}/>;
}
