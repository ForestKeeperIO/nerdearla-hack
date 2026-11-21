import { useId } from 'react';
import type { Columna, Revision } from '@/lib/encabezados';
import './tabla-encabezados.css';

const etiquetas: Record<string, string> = {
  id_eira: 'ID de EIRA', folio: 'Folio', nombre: 'Nombre', fecha_nacimiento: 'Fecha de nacimiento',
  edad: 'Edad', ciudad: 'Ciudad o municipio', servicio: 'Servicio', estudio: 'Estudio', fecha: 'Fecha',
  asistencia: 'Asistencia', tipo_registro: 'Tipo de registro', cantidad: 'Cantidad',
};

function Tabla({ columnas, titulo }: { columnas: Columna[]; titulo: string }) {
  const id = useId();
  return <div className="enc-tabla" role="region" tabIndex={0} aria-labelledby={id}>
    <table>
      <caption id={id} className="sr-only">{titulo}</caption>
      <thead><tr><th scope="col">Columna de tu archivo</th><th scope="col">Campo de EIRA</th><th scope="col">Confianza</th></tr></thead>
      <tbody>{columnas.map(({ encabezado, campo, probabilidad }, i) => <tr key={i} data-sin-campo={!campo}>
        <th scope="row">{encabezado || `Columna ${i + 1} (sin título)`}</th>
        <td>{campo ? etiquetas[campo] ?? campo.replaceAll('_', ' ') : 'Sin reconocer'}</td>
        <td><span className="enc-chip">{!campo ? 'Sin coincidencia' : probabilidad === undefined
          ? 'No informada' : `${Math.round(probabilidad * 100)} %`}</span></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function RevisionEncabezados({ revision, error, nombre }: { revision?: Revision; error?: string; nombre: string }) {
  const problema = error || (revision?.faltan ? `Falta${revision.faltan === 1 ? ' un campo reconocido' : 'n dos campos reconocidos'}. EIRA necesita al menos dos campos distintos. Pon sus nombres en la primera fila (por ejemplo, «Nombre» y «Fecha»), guarda el archivo y vuelve a elegirlo.` : '');
  return <section className="enc-revision" aria-label={`Encabezados de ${nombre}`}>
    <h3>Revisión de encabezados</h3>
    <p role="status" className={problema ? 'enc-error' : undefined}>{problema || (revision
      ? 'Vista previa de los encabezados. El archivo aún no se ha enviado.'
      : 'Leyendo la primera fila en este dispositivo…')}</p>
    {!!revision?.columnas.length && <>
      <Tabla columnas={revision.columnas} titulo={`Vista previa de ${nombre}`} />
      <p>Si una columna no corresponde, renómbrala en tu archivo y vuelve a elegirlo. No se puede reasignar aquí.</p>
    </>}
  </section>;
}

export function MapeoProcesado({ columnas, nombre }: { columnas?: Columna[]; nombre: string }) {
  if (!columnas?.length) return null;
  return <details className="enc-resultado">
    <summary>Ver encabezados del procesador ({columnas.length})</summary>
    <Tabla columnas={columnas} titulo={`Mapeo real de ${nombre}`} />
  </details>;
}
