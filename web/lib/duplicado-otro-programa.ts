// El procesador reconoce un archivo repetido sin mirar el programa. Si se cargó antes en otro
// programa, su aviso («ya se cargó… No se vuelve a cargar») no dice dónde quedó.

type Duplicado = { estado: string; programa: string; fuente_original: string; mensaje: string };

/**
 * Completa el aviso de un duplicado cuando el archivo original está en otro programa.
 * `programaDeFuente` da el id del programa de una fuente; `nombre` lo traduce para mostrarlo.
 */
export function avisarOtroPrograma<T extends Duplicado>(
  trabajo: T,
  programaDeFuente: (fuente: string) => string | undefined,
  nombre: (programa: string) => string,
): T {
  if (trabajo.estado !== 'duplicado' || !trabajo.fuente_original) return trabajo;
  const original = programaDeFuente(trabajo.fuente_original);
  if (!original || nombre(original) === nombre(trabajo.programa)) return trabajo;
  const donde = nombre(original);
  const aviso = `Quedó cargado en ${donde}, no en ${nombre(trabajo.programa)}. `
    + `Si ${donde} no era su programa, pide al equipo técnico retirarlo de ahí; después podrás subirlo aquí.`;
  return { ...trabajo, mensaje: `${trabajo.mensaje} ${aviso}`.trim() };
}
