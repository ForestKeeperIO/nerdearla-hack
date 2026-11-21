import Link from 'next/link';
import { fuentesDe } from '@/lib/informe';
import { fechaEs } from '@/lib/comun';

export const dynamic = 'force-dynamic';

export default async function Indice() {
  const fuentes = (await fuentesDe('global')).valor;
  const corte = fuentes.map(f => f.fecha_corte).sort().at(-1);
  return <div className="archivo-eira">
    <div className="apertura"><h1>Reportes</h1><p>Dos lecturas del trabajo de EIRA: el impacto por programa y la presencia en cada municipio.</p></div>
    <div className="catalogo-reportes">
      <Link href="/reportes/aliados" className="tapa">
        <span>Para aliados estratégicos</span><h2>Impacto por programa</h2><p>Tamizaje Rosa, otros programas y consolidado global.</p><strong>Leer reporte <i aria-hidden="true">↗</i></strong>
      </Link>
      <Link href="/reportes/territorial" className="tapa tapa-mapa">
        <span>Para gobierno y hospitales</span><h2>Presencia territorial</h2><p>Actividad por municipio, con ficha de evidencia para oficio.</p><strong>Consultar territorio <i aria-hidden="true">↗</i></strong>
      </Link>
    </div>
    <div className="pie-registro"><span>Fuente: registros consolidados de EIRA</span><span>{corte ? `Último corte: ${fechaEs(corte)}` : 'Sin fecha de corte'}</span></div>
  </div>;
}
