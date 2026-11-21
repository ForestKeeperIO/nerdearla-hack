type Nodo = [string, number, number];

function Plano({ movil }: { movil: boolean }) {
  const flecha = movil ? 'punta-movil' : 'punta-ancha';
  const nodos: Nodo[] = movil
    ? [['Excel', 2, 12], ['Next.js', 184, 12], ['Valkey', 184, 82], ['Python', 2, 82],
      ['SQLite', 2, 152], ['Tablero', 184, 152], ['Metabase', 2, 222]]
    : [['Excel', 2, 20], ['Next.js', 157, 20], ['Valkey', 312, 20], ['Python', 467, 20],
      ['Tablero', 312, 110], ['SQLite', 467, 110], ['Metabase', 622, 110]];
  const lineas = movil
    ? ['M118 34H178', 'M230 56V76', 'M257 82V62', 'M184 94H124',
      'M118 113H178', 'M60 126V146', 'M118 174H178', 'M60 196V216']
    : ['M118 42H151', 'M273 32H306', 'M312 53H279', 'M428 32H461',
      'M467 53H434', 'M525 64V104', 'M467 132H434', 'M583 132H616'];
  return <svg viewBox={movil ? '0 0 304 278' : '0 0 742 164'} className={movil ? 'cf-plano cf-movil' : 'cf-plano cf-ancho'} aria-hidden="true">
    <defs><marker id={flecha} viewBox="0 0 7 8" markerWidth="7" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M1 1 5.5 4 1 7" stroke="var(--vino)" strokeWidth="1.4" fill="none"/>
    </marker></defs>
    {lineas.map(d => <path key={d} d={d} fill="none" stroke="var(--vino)" strokeWidth="1.5" markerEnd={`url(#${flecha})`}/>)}
    {nodos.map(([nombre,x,y]) => <g key={nombre} transform={`translate(${x} ${y})`}>
      <rect width="116" height="44" rx="15" fill={nombre === 'Valkey' ? 'var(--vino-oscuro)' : 'var(--papel-2)'}/>
      <text x="58" y="27" textAnchor="middle" fill={nombre === 'Valkey' ? 'var(--superficie)' : 'var(--tinta)'}>{nombre}</text>
    </g>)}
  </svg>;
}

export function DiagramaMotor() {
  return <figure className="cf-diagrama">
    <Plano movil={false}/><Plano movil/>
    <figcaption>Next.js encola el Excel en Valkey. Python toma el trabajo, guarda los registros en SQLite y publica el resultado en Valkey. El tablero y Metabase consultan SQLite; este embudo lee Valkey.</figcaption>
  </figure>;
}
