# Qué vamos a hacer — Impacto EIRA (Reto 3)

**Contexto:** Vibeathon Nerdearla México 2026. Reto 3 de EIRA: consolidación de impacto.
**Entrega:** Devpost antes de las 16:00 CDMX del 2026-11-21. Corte de funciones a las 15:00.

## La idea en una frase

Cada cifra de EIRA con su acta de nacimiento: qué cuenta, de qué archivo salió, con qué certeza y contra cuántas mujeres del municipio.

Una herramienta que importa archivos de distintos programas de EIRA, los lleva a un modelo común, señala problemas de calidad y produce indicadores e informes donde cada cifra dice de dónde sale. Se demuestra con el caso de la guía: 120 atenciones y 80 participaciones con personas repetidas.

## Las tres piezas con nombre

1. **"Esto no se suma".** El sistema se niega a sumar atenciones con participaciones y explica por qué.
2. **Personas con certeza.** Verificadas por folio, probables por nombre + fecha de nacimiento, y un rango honesto con lo que no se puede identificar.
3. **Toque que verifica.** Tarjeta NFC con folio `EIRA-XXXX-XXXX`: cada asistencia futura entra como dato verificado y el tablero lo muestra en vivo.

## Arquitectura

- Los **archivos originales** son la fuente de verdad y quedan en disco.
- **Valkey** es el motor de cálculo: Sets de personas por dimensión, Hashes de conteos por unidad, un Stream de ajustes (bitácora) y Pub/Sub para el tablero en vivo. Personas únicas = intersecciones exactas de conjuntos (`SINTERCARD`). **Nunca** HyperLogLog ni estimaciones.
- En Valkey **no se guardan nombres**: solo claves HMAC-SHA256. Los archivos se reconstruyen siempre desde el origen.

## Stack

Node 22 · TypeScript · Hono + @hono/node-server · iovalkey · Valkey 8 · papaparse · SheetJS · React 18 + Vite · Recharts · Vitest. Interfaz en español.

## Plan de trabajo

| Tarea | Qué | Notas |
|---|---|---|
| 1 | Andamiaje, contrato (`shared/types.ts`), folios, Valkey local | En serie, primero |
| 2 | Importación CSV/Excel, mapeo de columnas, reglas de calidad, datos sintéticos | Paralelo tras T1 |
| 3 | Motor de indicadores sobre Valkey, denominadores públicos (INEGI, CONAPO) | Paralelo tras T1 |
| 4 | API HTTP (Hono), SSE en vivo, exportación de informe | Integra T2 + T3 |
| 5 | Pantallas: Importar, Calidad, Tablero, Informe, Registro NFC | Paralelo tras T1 |
| 6 | Dockerfile, compose, README, envío a Devpost | Cierre |

Plan completo con pruebas y comandos Valkey por operación: [`docs/superpowers/plans/2026-11-21-impacto-eira.md`](docs/superpowers/plans/2026-11-21-impacto-eira.md)

## Reglas duras (no negociables)

- Unidades exactas y **no sumables**: `persona`, `atencion`, `estudio`, `participacion`, `entrega_insumo`.
- Todo indicador lleva `valor`, `unidad`, `definición`, `fechaCorte`, `fuentes`, `denominador` y `advertencias`.
- Solo datos ficticios en archivos internos; datos públicos siempre con fuente y fecha.
- Deduplicación por nombre = propuesta que una persona confirma; nunca cifra oficial automática.
- Se dice "Valkey", nunca "Redis". Repositorio público, licencia MIT.

## Estado actual

Sin código todavía. Investigación y plan completos; siguiente paso: Tarea 1 (andamiaje).
