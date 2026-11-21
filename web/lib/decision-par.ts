export const opcionesPar = {
  mismo_evento: 'Misma persona, mismo evento',
  diferentes_eventos: 'Misma persona, otro evento',
  distinta: 'Personas distintas',
} as const;

export type IntencionPar = keyof typeof opcionesPar;
