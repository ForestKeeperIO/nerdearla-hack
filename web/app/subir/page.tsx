import Link from 'next/link';
import { informesActivos } from '@/lib/catalogo';
import { fuentesDe } from '@/lib/informe';

export const dynamic = 'force-dynamic';

export default async function Cargas() {
  const programas = await Promise.all(informesActivos().map(async p => ({ ...p, fuentes: (await fuentesDe(p.id)).valor })));
  return <div className="archivo-eira">
    <div className="apertura"><h1>Subir archivos</h1><p>Elige la coordinación que entrega el archivo. Después podrás revisar sus filas y confirmar las cifras.</p></div>
    <section aria-label="Elegir programa" className="registro">
      {programas.map(p => <Link key={p.id} href={`/informe/${p.id}/subir`} className="asiento">
        <div><h2>{p.nombre}</h2><p>{p.descripcion}</p></div>
        <span>{p.fuentes.length ? `${p.fuentes.length} archivos en el registro` : 'Sin archivos todavía'}</span><span className="abrir">Elegir</span>
      </Link>)}
    </section>
  </div>;
}
