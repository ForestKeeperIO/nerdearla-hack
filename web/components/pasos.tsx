// Indicador de pasos del recorrido: muestra dónde está la persona y qué falta.
// No es un menú: los pasos bloqueados se ven bloqueados y dicen por qué.
// En pantallas angostas se compacta a "Paso n de N · Título" con barra.
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import {
  indicePaso, motivoBloqueo, pasosDe, puedeEntrar, rutaPaso, TITULO_PASO,
  type EstadoRecorrido, type Paso,
} from '@/lib/recorrido';

export function IndicadorPasos({ estado, actual }: { estado: EstadoRecorrido; actual: Paso }) {
  const pasos = pasosDe(estado.alcance);
  const iActual = indicePaso(estado.alcance, actual);

  return (
    <>
      {/* Versión completa: ≥640px */}
      <nav aria-label="Pasos del informe" className="pasos">
        {pasos.map((p, i) => {
          const esActual = i === iActual;
          const entra = puedeEntrar(estado, p);
          const hecho = i < iActual && entra;
          const bloqueado = !entra && !esActual;
          const motivo = bloqueado ? motivoBloqueo(estado, p) : null;
          const clase = esActual ? 'pasos__item--actual' : hecho ? 'pasos__item--hecho' : bloqueado ? 'pasos__item--bloqueado' : '';
          const interior = (
            <>
              <span className="pasos__num" aria-hidden="true">
                {hecho ? <Check className="size-3.5" strokeWidth={2.5} /> : bloqueado ? <Lock className="size-3" strokeWidth={2} /> : i + 1}
              </span>
              <span>
                <span className="pasos__nombre">{TITULO_PASO[p]}</span>
                {motivo && <span className="pasos__motivo">{motivo}</span>}
              </span>
            </>
          );
          const enlace = !esActual && entra ? rutaPaso(estado.alcance, p) : null;
          return (
            <div key={p} className="pasos__paso" style={{ flex: i < pasos.length - 1 ? 1 : undefined }}>
              {enlace ? (
                <Link href={enlace} className={`pasos__item ${clase} no-underline`} style={{ color: 'inherit' }}>
                  {interior}
                </Link>
              ) : (
                <div className={`pasos__item ${clase}`} aria-current={esActual ? 'step' : undefined}>
                  {interior}
                </div>
              )}
              {i < pasos.length - 1 && <span className="pasos__linea" aria-hidden="true" />}
            </div>
          );
        })}
      </nav>
      {/* Versión compacta: <640px */}
      <div className="pasos-compacto" aria-hidden="true">
        <p className="etiqueta" style={{ margin: 0 }}>
          Paso {iActual + 1} de {pasos.length} · {TITULO_PASO[actual]}
        </p>
        <div className="pasos-compacto__barra">
          <span style={{ width: `${((iActual + 1) / pasos.length) * 100}%` }} />
        </div>
      </div>
    </>
  );
}
