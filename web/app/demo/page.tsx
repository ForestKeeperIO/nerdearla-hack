import { InicioDemo } from '@/components/demo-guiado';
import { fechaCorteDe } from '@/lib/informe';
import { tiposDe } from '@/lib/catalogo';
import { PROGRAMA_DEMO } from '@/lib/demo-guiado';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recorrido guiado · EIRA' };

/** Entrada del recorrido guiado: calcula lo que mandaría «Subir archivos» y arranca solo. */
export default async function Demo() {
  const tipos = tiposDe(PROGRAMA_DEMO);
  // La unidad inicial sale del catálogo del programa.
  const unidad = tipos[0]?.clave ?? '';
  let fechaCorte = new Date().toISOString().slice(0, 10);
  try { fechaCorte = await fechaCorteDe(PROGRAMA_DEMO); } catch { /* Sin base: el paso de subida lo dirá. */ }
  return <InicioDemo unidad={unidad} fechaCorte={fechaCorte} />;
}
