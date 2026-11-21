import { GitBranch } from 'lucide-react';
import { EmbudoVivo } from '@/components/embudo-vivo';
import credito from '@/lib/credito-devin.json';
import { leerObservatorio } from '@/lib/observatorio';
import './como.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cómo funciona · Impacto EIRA' };
const repo = 'https://github.com/ForestKeeperIO/nerdearla-hack/commit/';

export default async function ComoFunciona() {
  const datos = await leerObservatorio().catch(() => null);
  return <article className="archivo-eira atlas cf">
    <EmbudoVivo inicial={datos}/>
    <section className="cf-tarjeta cf-devin">
      <div><h2><GitBranch aria-hidden/>Construido con Devin</h2>
        <p><strong>{credito.total}</strong> commits únicos con Devin como autor o coautor. Corte de compilación: <a href={repo + credito.corte}>{credito.corte}</a>.</p></div>
      <div><h3>Cambios acreditados en Git</h3>
        <ul>{credito.ejemplos.map(e => <li key={e.sha}><a href={repo+e.sha}>{e.rama ? `${e.rama} · ` : ''}{e.sha}</a> · {e.titulo}</li>)}</ul>
        <details><summary>Ver ramas con crédito</summary><p>{credito.ramas.join(' · ')}</p><small>Ramas con commits acreditados en su línea de primer padre. Git conserva relaciones entre commits, no su rama de origen.</small></details>
      </div>
    </section>
  </article>;
}
