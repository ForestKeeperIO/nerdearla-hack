# Qué vamos a hacer · Impacto EIRA (Reto 3)

**Contexto:** Nerdearla Vibeathon by Devin, CDMX. Reto 3 de EIRA: consolidación de impacto.
**Entrega:** Devpost antes de las 16:00 CDMX del 2026-11-21. Corte de funciones a las 15:00.

## La idea en una frase

Sube los Excel de cada coordinación y obtén el informe, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.

## Por qué

EIRA nos lo dijo en sala: cada programa lleva su Excel, Presidencia los junta a mano, y su ID (iniciales más fecha de nacimiento) puede repetirse entre dos personas. Quieren subir, aplicar filtros de calidad, ver una vista previa y exportar, con una calificación en estrellas. Nota completa: [`docs/contexto/nota-granola-eira.md`](docs/contexto/nota-granola-eira.md).

## Cómo se reparte

| Parte | Lenguaje | Rama |
|---|---|---|
| Leer Excel, deduplicar, unificar reportes y programas | Python | `python` (sugerida) |
| Base Valkey limpia y datos de demostración | TypeScript | `valkey-base` |
| Frontend y tableros | TypeScript (Next.js) | `fe` |

Las partes se comunican solo por Valkey: [`docs/contrato-valkey.md`](docs/contrato-valkey.md).

```
Frontend ──archivo y trabajo──► Valkey ──► Python (procesa)
Frontend ◄──resultados y avisos── Valkey ◄── Python (escribe)
```

## Duplicados en tres capas

1. **El mismo archivo**, aunque cambie de nombre, se vuelva a guardar o se exporte a CSV.
2. **La misma fila**: de una versión nueva solo entran las filas nuevas; lo que dos coordinaciones registraron igual se cuenta una vez.
3. **La misma persona**: mismo ID y mismo nombre es una; mismo ID y nombre distinto lo decide una persona.

## Reglas que no se negocian

- Unidades que no se suman: persona, atención, estudio, participación, entrega de insumo.
- Sin conteos aproximados: EIRA prohíbe presentar una deduplicación estimada como cifra oficial.
- En Valkey no van nombres completos ni el ID en claro. Se dice "seudonimizado", nunca "anónimo".
- Solo datos ficticios. Se dice "Valkey", nunca "Redis". Repositorio público, licencia MIT.

## Dónde seguir leyendo

- Guía para agentes: [`AGENTS.md`](AGENTS.md)
- Historial de decisiones: [`docs/contexto/historial-de-decisiones.md`](docs/contexto/historial-de-decisiones.md)
- Plan: [`docs/superpowers/plans/2026-11-21-impacto-eira.md`](docs/superpowers/plans/2026-11-21-impacto-eira.md)
