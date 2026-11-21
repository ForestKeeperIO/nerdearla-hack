import { useId } from 'react';

export function AnilloDato({valor,etiqueta}: {valor:number|null;etiqueta:string}) {
  const id = useId().replaceAll(':','');
  return <figure className="anillo-dato" aria-label={`${etiqueta}: ${valor===null?'en construcción':Math.round(valor)+' %'}`}>
    <svg viewBox="0 0 150 90" aria-hidden="true"><defs><pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="2" height="6" fill="var(--linea-fuerte)"/></pattern></defs>
      <path d="M14 75a61 61 0 0 1 122 0" fill="none" stroke={`url(#${id})`} strokeWidth="16"/>
      {valor!==null && valor>0 && <path d="M14 75a61 61 0 0 1 122 0" fill="none" stroke="var(--vino)" strokeWidth="16" pathLength="100" strokeDasharray={`${Math.min(100,valor)} 100`} />}
      <text x="75" y="71" textAnchor="middle">{valor===null?'—':Math.round(valor)+'%'}</text></svg>
    <figcaption>{etiqueta}</figcaption></figure>;
}
