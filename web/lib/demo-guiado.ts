// Guion del recorrido guiado de /demo. Puro: sin acceso a Valkey ni al DOM.

export const PROGRAMA_DEMO = 'tamizaje-rosa';
export const HOJA_DEMO = '/demo/jornada-nueva-chapala.xlsx';
export const NOMBRE_HOJA = 'jornada-nueva-chapala.xlsx';
/** Milisegundos que dura cada globo antes de avanzar solo. */
export const DURACION = 6500;

export const FASES = ['Filtrar el Tablero', 'Subir una hoja nueva', 'Los datos se actualizan', 'Sacar dos reportes'] as const;

export type PasoDemo = {
  /** Índice en FASES; -1 para el cierre. */
  fase: number;
  titulo: string;
  texto: string;
  /** Ruta con su consulta; el recorrido navega solo si no está ahí. */
  ruta: string;
  /** Selector CSS de lo que se resalta; sin él, el globo va al centro. */
  objetivo?: string;
  accion?: 'subir' | 'resultado';
};

export const PASOS: PasoDemo[] = [
  { fase: 0, ruta: '/tablero', objetivo: '.atlas-kpis', titulo: 'Todo EIRA en una pantalla',
    texto: 'Los Excel de cada coordinación ya están juntos. Cada persona cuenta una sola vez por programa.' },
  { fase: 0, ruta: `/tablero?programa=${PROGRAMA_DEMO}`, objetivo: '.atlas-filtros', titulo: 'Filtramos por programa',
    texto: 'Elegimos Tamizaje Rosa. Las cifras, el mapa y las gráficas cambian al instante.' },
  { fase: 0, ruta: `/tablero?programa=${PROGRAMA_DEMO}&estado=14`, objetivo: '.atlas-mapa', titulo: 'Y por territorio',
    texto: 'Jalisco, municipio por municipio. Un clic en el mapa filtra ese municipio.' },
  { fase: 0, ruta: `/tablero?programa=${PROGRAMA_DEMO}&desde=2026-01&hasta=2026-06`, objetivo: '.bento-meses', titulo: 'Y por periodo',
    texto: 'Enero a junio de 2026: solo los registros de esos meses, comparados con el periodo anterior.' },
  { fase: 1, ruta: '/subir', objetivo: '.zona-carga', accion: 'subir', titulo: 'Llega una hoja nueva',
    texto: 'El recorrido sube solo la hoja de la jornada de Chapala (35 filas). Si ya se había subido, el sistema la reconoce y no suma doble.' },
  { fase: 1, ruta: '/subir', objetivo: '[data-demo="archivos"]', accion: 'resultado', titulo: 'El sistema dice qué pasó',
    texto: 'Filas nuevas, filas omitidas por repetidas y la calidad del archivo, en palabras.' },
  { fase: 2, ruta: '/tablero', objetivo: '.atlas-kpis', titulo: 'La cifra sube sola',
    texto: 'El Tablero ya cuenta la carga nueva, sin recargar a mano: más personas y un municipio más.' },
  { fase: 2, ruta: '/tablero', objetivo: '.atlas-mapa', titulo: 'Chapala aparece en el mapa',
    texto: 'El municipio nuevo queda pintado y entra a la lista por municipio.' },
  { fase: 2, ruta: '/tablero', objetivo: '.bento-cargas', titulo: 'La carga queda registrada',
    texto: 'En «Cargas recientes» está el archivo con su calificación de calidad.' },
  { fase: 3, ruta: '/reportes?origen=tablero', objetivo: '.catalogo-reportes', titulo: 'Dos reportes, una selección',
    texto: 'La selección del Tablero viaja a Reportes: uno para aliados estratégicos y otro territorial.' },
  { fase: 3, ruta: '/reportes/aliados?origen=tablero', objetivo: '.utiles', titulo: 'Impacto para aliados estratégicos',
    texto: 'Con estas mismas cifras. Se descarga en PDF y en CSV desde aquí.' },
  { fase: 3, ruta: '/reportes/territorial?origen=tablero', objetivo: '.utiles', titulo: 'Territorial para gobierno y hospitales',
    texto: 'Presencia por municipio, con PDF y CSV. Cada cifra dice de qué archivos sale y con qué corte.' },
  { fase: -1, ruta: '/tablero', titulo: 'Eso es todo',
    texto: 'Filtrar, subir, ver el cambio y sacar los reportes. Ahora puedes explorar por tu cuenta.' },
];

/** Etiqueta de avance: «Paso 2 de 4 · Subir una hoja nueva». */
export function etiquetaFase(p: PasoDemo): string {
  return p.fase < 0 ? 'Fin del recorrido' : `Paso ${p.fase + 1} de ${FASES.length} · ${FASES[p.fase]}`;
}

/** Índice válido dentro del guion, o 0. */
export function pasoValido(n: unknown): number {
  const i = Number(n);
  return Number.isInteger(i) && i >= 0 && i < PASOS.length ? i : 0;
}

/** Frase del resultado de la carga, según lo que escribió el motor en el trabajo. */
export function fraseResultado(t: { estado: string; mensaje?: string; nivel_duplicado?: string } | undefined): string | null {
  if (!t || t.estado === 'pendiente' || t.estado === 'procesando') return null;
  if (t.estado === 'duplicado') return `Esta hoja ya estaba cargada: no se cuenta dos veces. ${t.mensaje ?? ''}`.trim();
  if (t.estado === 'error') return `El archivo no se pudo leer. ${t.mensaje ?? ''}`.trim();
  return t.mensaje || 'Archivo procesado.';
}
