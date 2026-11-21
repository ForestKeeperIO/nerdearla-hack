'use client';

// "¿Es la misma persona?": un caso a la vez, dos registros lado a lado, dos botones.
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Par } from '@/lib/comun';
import { decidirPar } from '@/lib/acciones';

/** Fila de la comparación: el valor de cada registro, resaltado si difieren. */
function FilaCampo({ campo, a, b }: { campo: string; a: string; b: string }) {
  const difiere = a !== b;
  const celda = { padding: 'var(--sp-2) var(--sp-3)', borderTop: 'var(--border)', verticalAlign: 'top' as const };
  const resaltado = difiere ? { background: 'var(--rubor)' } : {};
  return (
    <tr>
      <th scope="row" className="etiqueta" style={{ ...celda, textAlign: 'left', fontWeight: 500 }}>{campo}{difiere && <small style={{display:'block'}}>Difiere</small>}</th>
      <td style={{ ...celda, ...resaltado }}>{a}</td>
      <td style={{ ...celda, ...resaltado }}>{b}</td>
    </tr>
  );
}

function separar(etiqueta: string) {
  const [iniciales, ...resto] = etiqueta.split(/\s*·\s*/);
  return [iniciales, resto.find(s => !/años$/i.test(s)) || 'Sin dato', resto.find(s => /años$/i.test(s)) || 'Sin dato'];
}

export function MismaPersona({
  alcance,
  pares,
  nombreFuente,
  decididos,
  alDecidir,
}: {
  alcance: string;
  pares: Par[];
  nombreFuente: Record<string, string>;
  decididos: Set<string>;
  alDecidir: (id: string) => void;
}) {
  const [cargando, start] = useTransition();
  const [espera, setEspera] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const pendientes = pares.filter((p) => !decididos.has(p.id));
  const actual = pendientes[0];
  const sinConfirmar = !!actual && espera === actual.id;
  useEffect(() => {
    if (!sinConfirmar) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [sinConfirmar, router]);

  function decidir(decision: 'misma' | 'distinta') {
    if (!actual) return;
    const id = actual.id;
    start(async () => {
      try {
        const aplicado = await decidirPar(alcance, id, decision);
        if (aplicado) alDecidir(id); else setEspera(id);
        setError(''); router.refresh();
      } catch { setError('No se confirmó el envío. Actualiza para revisar el estado.'); }
    });
  }

  if (!actual) {
    return (
      <p style={{ borderTop: 'var(--border)', paddingTop: 'var(--sp-4)' }}>
        No quedan casos por decidir.
      </p>
    );
  }

  return (
    <div aria-busy={cargando}>
      <div className="flex items-baseline justify-between gap-3">
        <p style={{ fontWeight: 500 }}>¿Es la misma persona?</p>
        <p className="etiqueta">Faltan {pendientes.length} por decidir</p>
      </div>
      {actual.motivo && <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>{actual.motivo}</p>}
      <table className="mt-4" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-small)', border: 'var(--border)', borderRadius: 'var(--r-sm)' }}>
        <thead>
          <tr>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', width: '7rem' }}></th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', fontWeight: 500 }}>Registro A</th>
            <th scope="col" className="etiqueta" style={{ padding: 'var(--sp-2) var(--sp-3)', textAlign: 'left', fontWeight: 500 }}>Registro B</th>
          </tr>
        </thead>
        <tbody>
          {['Iniciales','Ciudad','Edad'].map((campo,i) => <FilaCampo key={campo} campo={campo} a={separar(actual.a.etiqueta)[i]} b={separar(actual.b.etiqueta)[i]} />)}
          <FilaCampo campo="Archivo" a={nombreFuente[actual.a.fuente] ?? actual.a.fuente} b={nombreFuente[actual.b.fuente] ?? actual.b.fuente} />
          <FilaCampo campo="Fila" a={String(actual.a.fila)} b={String(actual.b.fila)} />
        </tbody>
      </table>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>
        Si las iniciales y los datos coinciden, consulta las filas de origen antes de decidir.
      </p>
      <p role="status">{cargando ? 'Aplicando la decisión…' : sinConfirmar ? 'Enviada. Esperando confirmación…' : error}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn--primario" disabled={cargando || sinConfirmar} onClick={() => decidir('misma')}>
          Es la misma persona
        </button>
        <button type="button" className="btn btn--secundario" disabled={cargando || sinConfirmar} onClick={() => decidir('distinta')}>
          Son dos personas
        </button>
      </div>
      <p className="etiqueta" style={{ marginTop: 'var(--sp-3)' }}>
        Mientras no se decida, cada par cuenta como una sola persona en las cifras.
      </p>
    </div>
  );
}
