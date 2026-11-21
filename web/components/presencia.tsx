// Presencia territorial: bloque secundario al final de la Vista previa y del
// informe. Dice dónde está EIRA, no dónde falta: titular en positivo, lista de
// municipios con actividad y un mosaico discreto (vino = con actividad, línea =
// el resto, sin rótulos ni leyenda de faltantes). Sin porcentajes ni alertas.
import type { ResumenPresencia } from '@/lib/territorio';

export function PresenciaTerritorial({
  resumen,
  Titulo = 'h2',
}: {
  resumen: ResumenPresencia;
  Titulo?: 'h2' | 'h3';
}) {
  const { municipios, estados } = resumen;
  return (
    <section aria-labelledby="presencia-titulo">
      <Titulo id="presencia-titulo" style={{ fontSize: Titulo === 'h2' ? 15 : undefined }}>
        Presencia en {municipios.toLocaleString('es-MX')}{' '}
        {municipios === 1 ? 'municipio' : 'municipios'} de {estados.length}{' '}
        {estados.length === 1 ? 'estado' : 'estados'}
      </Titulo>
      {estados.map((e) => (
        <div key={e.estadoClave} style={{ marginTop: 'var(--sp-4)' }}>
          <p style={{ fontWeight: 500 }}>{e.estado}</p>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-1)' }}>
            {e.activos.map((a) => a.nombre).join(' · ')}
          </p>
          <div className="mosaico" style={{ marginTop: 'var(--sp-3)' }} aria-hidden="true">
            {e.mosaico.map((c) => (
              <span
                key={c.clave}
                className={c.activo ? 'mosaico__cuadro mosaico__cuadro--activo' : 'mosaico__cuadro'}
              />
            ))}
          </div>
          <p className="etiqueta" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-meta)' }}>
            de {e.totalEstado} municipios de {e.estado}
          </p>
        </div>
      ))}
    </section>
  );
}
