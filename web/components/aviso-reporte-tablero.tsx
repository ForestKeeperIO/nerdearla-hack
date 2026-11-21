import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { iniciativa } from '@/lib/catalogo';
import { generarReporte } from '@/lib/generar-reporte';
import { consultaDe, periodoTexto, type Seleccion } from '@/lib/seleccion-tablero';
import { catalogoMunicipios } from '@/lib/territorio';
import { BotonGenerar } from './boton-generar';
import styles from './aviso-reporte-tablero.module.css';

export function AvisoReporteTablero({ seleccion, consulta }: { seleccion: Seleccion; consulta: string }) {
  const lugares = catalogoMunicipios();
  const filtros = consultaDe(seleccion);
  const chips = [
    ...seleccion.estado.map(c => lugares.find(m => m.estado_clave === c)?.estado ?? 'Estado no reconocido'),
    ...seleccion.municipio.map(c => lugares.find(m => m.clave === c)?.municipio ?? 'Municipio no reconocido'),
    ...seleccion.programa.map(p => iniciativa(p)?.nombre ?? 'Programa no reconocido'),
    ...seleccion.servicio,
    ...(seleccion.desde || seleccion.hasta ? [periodoTexto(seleccion).replace('–', ' – ')] : []),
  ];

  async function guardar(datos: FormData) {
    'use server';
    await generarReporte(String(datos.get('plantilla')), consulta);
  }

  return <section className={styles.aviso} aria-labelledby="seleccion-tablero">
    <div>
      <h2 id="seleccion-tablero">Tu selección del Tablero</h2>
      <ul className={styles.chips} aria-label="Filtros del reporte">
        {(chips.length ? chips : ['Todos los programas', 'Todo el periodo']).map((texto, i) => <li key={i}>{texto}</li>)}
      </ul>
      <Link className={styles.cambiar} href={filtros ? `/tablero?${filtros}` : '/tablero'}>
        <SlidersHorizontal aria-hidden/> Cambiar filtros
      </Link>
    </div>
    <form action={guardar} aria-labelledby="seleccion-tablero" className={styles.formulario}>
      <fieldset>
        <legend>¿Para quién es el reporte?</legend>
        {([['aliados', 'Para aliados'], ['territorial', 'Para gobierno y hospitales']] as const).map(([tipo, texto]) =>
          <label key={tipo}><input type="radio" name="plantilla" value={tipo} defaultChecked={tipo === 'aliados'}/>{texto}</label>
        )}
      </fieldset>
      <BotonGenerar texto="Generar mi reporte"/>
    </form>
  </section>;
}
