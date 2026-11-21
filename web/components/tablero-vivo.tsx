'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function TableroVivo({ revision }: { revision: string }) {
  const router = useRouter();
  const [aviso, avisar] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    let enCurso = false;
    async function comprobar() {
      if (document.hidden || enCurso) return;
      enCurso = true;
      try {
        const r = await fetch('/tablero/version', { cache: 'no-store', signal: abort.signal });
        if (r.ok && (await r.json()).revision !== revision && !abort.signal.aborted) {
          avisar('Hay datos nuevos. Actualizando el tablero…');
          router.refresh();
        }
      } catch { /* Se conserva el último corte y se vuelve a intentar al recuperar la conexión. */ }
      finally { enCurso = false; }
    }
    const id = window.setInterval(comprobar,4000);
    const ocultar = window.setTimeout(() => avisar(''),4500);
    document.addEventListener('visibilitychange',comprobar);
    return () => {
      abort.abort(); clearInterval(id); clearTimeout(ocultar);
      document.removeEventListener('visibilitychange',comprobar);
    };
  },[revision,router]);
  return <span className={aviso ? 'bento-aviso-vivo' : 'visually-hidden'} role="status">{aviso}</span>;
}
