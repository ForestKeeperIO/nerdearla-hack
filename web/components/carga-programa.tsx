import Link from 'next/link';
import { exigirPaso } from '@/lib/guardia';
import { fechaCorteDe, fuentesDe, leerInforme, trabajosDe } from '@/lib/informe';
import { fijarFechaCorte } from '@/lib/acciones';
import { puedeEntrar, motivoBloqueo } from '@/lib/recorrido';
import { informesActivos, tiposDe } from '@/lib/catalogo';
import { motorActivo } from '@/lib/claves';
import { soloLectura } from '@/lib/modo-carga';
import { estadosCatalogo } from '@/lib/territorio';
import { MarcoInforme } from '@/components/marco';
import { PieDePaso } from '@/components/pie-de-paso';
import { SubirArchivos } from '@/components/subir';
import { ListaVivo } from '@/components/lista-vivo';
import { Toaster } from '@/components/ui/sonner';

export async function CargaPrograma({ programa:a }: {programa:string}) {
  const { alcance, estado } = await exigirPaso(a, 'subir');
  const [inf, trabajos, fuentes] = await Promise.all([
    leerInforme(alcance),
    trabajosDe(alcance),
    fuentesDe(alcance),
  ]);
  const tipos = tiposDe(alcance).map((t) => ({ clave: t.clave, etiqueta: t.etiqueta }));
  if (tipos.length > 1 && motorActivo() === 'motor') tipos.unshift({ clave: 'segun_fila', etiqueta: 'Leer el tipo de cada fila' });
  const fechaCorte = inf.fecha_corte || (await fechaCorteDe(alcance));
  const listo = puedeEntrar(estado, 'calidad');

  return (
    <MarcoInforme
      estado={estado}
      paso="subir"
      titulo="Subir archivos"
      bajada={`Arrastra el Excel o CSV de cada coordinación de este programa. Si el mismo archivo, una fila o una persona ya estaban, no se cuentan dos veces.`}
    >
      {!inf.fecha_corte && !soloLectura() && (
        <form action={fijarFechaCorte.bind(null, alcance)} className="tarjeta mb-6" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 'var(--sp-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
            <span style={{ fontWeight: 500 }}>¿Hasta qué fecha llega este informe?</span>
            <span className="etiqueta">Las cifras se calculan con datos hasta esta fecha de corte.</span>
            <input
              type="date"
              name="fecha_corte"
              required
              defaultValue={fechaCorte}
              style={{ border: '1px solid var(--linea-fuerte)', borderRadius: 'var(--r-sm)', padding: '0 var(--sp-3)', background: 'var(--superficie)', marginTop: 'var(--sp-2)' }}
            />
          </label>
          <button type="submit" className="btn btn--secundario btn--sm">Guardar fecha de corte</button>
        </form>
      )}

      <SubirArchivos key={alcance} alcance={alcance} tipos={tipos} fechaCorte={fechaCorte} estados={estadosCatalogo()}
        programas={informesActivos().map(({id,nombre,tipos_de_registro})=>({id,nombre,tipos_de_registro}))} lectura={soloLectura()} />

      <div className="mt-10">
        <ListaVivo alcance={alcance} inicial={{ trabajos: trabajos.valor, fuentes: fuentes.valor }} lectura={soloLectura()} />
      </div>

      <PieDePaso estado={estado} paso="subir">
        <div style={{ textAlign: 'right' }}>
          {listo ? (
            <Link href={`/informe/${alcance}/calidad`} className="btn btn--primario">Continuar a Calidad</Link>
          ) : (
            <>
              <button type="button" className="btn btn--primario" disabled>Continuar a Calidad</button>
              <p className="etiqueta" style={{ marginTop: 'var(--sp-2)' }}>{motivoBloqueo(estado, 'calidad')}</p>
            </>
          )}
        </div>
      </PieDePaso>
      <Toaster position="bottom-right" />
    </MarcoInforme>
  );
}
