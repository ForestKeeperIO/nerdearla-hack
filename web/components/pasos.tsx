// Indicador de pasos del recorrido: muestra dónde está la persona y qué falta.
// No es un menú: los pasos bloqueados se ven bloqueados y dicen por qué.
// Patrón: referencia Decimals (número en mono + título + conector hairline).
import { Check, Lock } from 'lucide-react';
import {
  indicePaso, motivoBloqueo, pasoActual, pasosDe, puedeEntrar, TITULO_PASO,
  type EstadoRecorrido, type Paso,
} from '@/lib/recorrido';

export function IndicadorPasos({ estado, actual }: { estado: EstadoRecorrido; actual: Paso }) {
  const pasos = pasosDe(estado.alcance);
  const indiceActual = indicePaso(estado.alcance, pasoActual(estado));
  const iActual = indicePaso(estado.alcance, actual);

  return (
    <nav aria-label="Pasos del informe" className="pasos">
      {pasos.map((p, i) => {
        const hecho = i < indiceActual || (i < iActual);
        const esActual = p === actual;
        const bloqueado = !puedeEntrar(estado, p) && !esActual;
        const motivo = bloqueado ? motivoBloqueo(estado, p) : null;
        const clase = esActual ? 'pasos__item--actual' : hecho || puedeEntrar(estado, p) ? 'pasos__item--hecho' : 'pasos__item--bloqueado';
        return (
          <div key={p} className="pasos__paso" style={{ flex: i < pasos.length - 1 ? 1 : undefined }}>
            <div className={`pasos__item ${clase}`} aria-current={esActual ? 'step' : undefined}>
              <span className="pasos__num" aria-hidden="true">
                {hecho || (puedeEntrar(estado, p) && i < iActual) ? <Check className="size-3.5" strokeWidth={2.5} /> : bloqueado ? <Lock className="size-3" strokeWidth={2} /> : i + 1}
              </span>
              <span>
                <span className="pasos__nombre">{TITULO_PASO[p]}</span>
                {motivo && <span className="pasos__motivo">{motivo}</span>}
              </span>
            </div>
            {i < pasos.length - 1 && <span className="pasos__linea" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}
