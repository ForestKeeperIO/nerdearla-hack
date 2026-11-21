import Link from 'next/link';
import { alcancesDemo, estadoRecorrido, tituloInforme } from '@/lib/informe';
import { indicePaso, motivoBloqueo, pasoActual, pasosDe, puedeEntrar, TITULO_PASO, type EstadoRecorrido } from '@/lib/recorrido';
import { iniciativa } from '@/lib/catalogo';
import { Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** Texto de avance del informe: "Sin empezar", "Paso 2 de 4: Calidad", "Listo para exportar". */
function avance(e: EstadoRecorrido): { texto: string; accion: string; ruta: string | null } {
  const pasos = pasosDe(e.alcance);
  const actual = pasoActual(e);
  const llegoAlFinal = actual === 'exportar' && puedeEntrar(e, 'exportar');

  if (e.alcance === 'global' && !puedeEntrar(e, 'calidad')) {
    return { texto: motivoBloqueo(e, 'calidad') ?? 'Bloqueado', accion: 'Bloqueado', ruta: null };
  }
  if (llegoAlFinal) return { texto: 'Listo para exportar', accion: 'Ver informe', ruta: `/informe/${e.alcance}/exportar` };
  if (e.fuentes === 0 && e.alcance !== 'global') return { texto: 'Sin empezar', accion: 'Empezar', ruta: `/informe/${e.alcance}/subir` };
  if (e.fuentes === 0) return { texto: 'Sin empezar', accion: 'Empezar', ruta: `/informe/${e.alcance}/calidad` };
  const n = indicePaso(e.alcance, actual) + 1;
  return {
    texto: `Paso ${n} de ${pasos.length}: ${TITULO_PASO[actual]}`,
    accion: 'Continuar',
    ruta: `/informe/${e.alcance}/${actual}`,
  };
}

export default async function Portada() {
  const estados = await Promise.all(alcancesDemo().map((a) => estadoRecorrido(a)));
  // Una sola acción primaria: empezar (o seguir) el primer informe de programa.
  const siguiente = estados.find((e) => e.alcance !== 'global' && e.fuentes === 0)
    ?? estados.find((e) => e.alcance !== 'global');
  const a = siguiente ? avance(siguiente) : null;
  const cta = a?.ruta
    ? { href: a.ruta, texto: siguiente!.fuentes === 0 ? 'Subir archivos' : `${a.accion}: ${tituloInforme(siguiente!.alcance)}` }
    : { href: '/informe/tamizaje-rosa/subir', texto: 'Subir archivos' };

  return (
    <div>
      {/* Llegada: qué es esto y qué hacer, en una mirada */}
      <section aria-labelledby="titulo-llegada">
        <h1 id="titulo-llegada">¿Cuántas personas apoyó EIRA?</h1>
        <p className="lead mt-3" style={{ maxWidth: '56ch', color: 'var(--tinta-suave)' }}>
          Sube los Excel de cada coordinación y el informe de impacto se arma solo:
          sin contar dos veces el mismo archivo, la misma fila ni la misma persona.
        </p>
        <p className="etiqueta mono" style={{ marginTop: 'var(--sp-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Subir → Calidad → Vista previa → Exportar
        </p>
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <Link href={cta.href} className="btn btn--primario no-underline">{cta.texto}</Link>
        </div>
      </section>

      <h2 className="etiqueta" style={{ marginTop: 'var(--sp-10)', fontWeight: 500 }}>
        Informes
      </h2>
      <div className="mt-3" role="list">
        {estados.map((e, i) => {
          const a = avance(e);
          const ini = e.alcance === 'global' ? null : iniciativa(e.alcance);
          const contenido = (
            <>
              <span className="fila__indice mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="fila__cuerpo">
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18 }}>
                  {tituloInforme(e.alcance)}
                </span>
                <span className="etiqueta" style={{ display: 'block', marginTop: 2 }}>
                  {ini?.descripcion ?? 'Junta todos los programas: cada programa suma sus personas al total.'}
                </span>
                <span className="etiqueta" style={{ display: 'block', marginTop: 4, color: a.ruta ? 'var(--tinta-suave)' : 'var(--aviso)' }}>
                  {a.texto}
                </span>
              </span>
              <span className="fila__dato">
                {a.ruta ? (
                  <span className="btn btn--secundario btn--sm">{a.accion}</span>
                ) : (
                  <span className="estado estado--aviso"><Lock className="size-3.5" aria-hidden="true" /> Bloqueado</span>
                )}
              </span>
            </>
          );
          return a.ruta ? (
            <Link key={e.alcance} href={a.ruta} role="listitem" className="fila no-underline" style={{ color: 'inherit' }}>
              {contenido}
            </Link>
          ) : (
            <div key={e.alcance} role="listitem" className="fila" style={{ opacity: 0.9 }}>
              {contenido}
            </div>
          );
        })}
      </div>
    </div>
  );
}
