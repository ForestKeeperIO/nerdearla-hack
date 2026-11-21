export const opcionesPar = {
  mismo_evento: 'Misma persona, mismo evento',
  diferentes_eventos: 'Misma persona, diferentes eventos',
  distinta: 'Son personas distintas',
} as const;

export type IntencionPar = keyof typeof opcionesPar;
