# Guion del pitch — 2 minutos

Sobre la **versión en blanco** del prototipo. Los informes del demo son
**Tamizaje Rosa**, **Melenas en Movimiento** y el **Global**. Los archivos que
se pueden subir en vivo son los de `reportes/` (rama `motor`):
`tamizaje-rosa.xlsx` (listo), `reporte_final_2.xlsx` (idéntico),
`tamizaje-rosa-reguardado.xlsx` y `tamizaje-rosa.csv` (mismo contenido) y
`tamizaje-rosa_v2.xlsx` (versión nueva).

**Nota honesta de preparación:** el archivo de Melenas no existe aún como
`.xlsx` real; su informe sale de la semilla de desarrollo
(`web/scripts/semilla-dev.ts`, rama `fe`), que precarga las dos fuentes, los
conteos y tres pares pendientes. Si el motor no está cableado al entorno en el
momento del pitch, la semilla ya trae los mensajes de cada archivo tal como
salieron en la verificación local (tabla de los siete archivos en `NOTAS.md`).
El video de respaldo cubre cualquier falla en vivo (ver al final).

| Tiempo | En pantalla | Se dice |
|---|---|---|
| 0:00–0:10 | Portada: los tres informes —Tamizaje Rosa, Melenas en Movimiento, Global bloqueado con su motivo | "Presidencia de EIRA junta a mano los Excel de cada coordinación cada vez que un donante pide un informe. Esto es lo que ven al entrar: un informe por programa y uno global." |
| 0:10–0:25 | Tamizaje Rosa → Subir: arrastrar `tamizaje-rosa.xlsx`; aparece "Listo" con sus filas | "Sube el Excel de la coordinación. Sin tecnicismos: el archivo dice en palabras qué pasó." |
| 0:25–0:40 | Subir `reporte_final_2.xlsx` → "Este archivo ya se cargó… como 'tamizaje-rosa.xlsx'" | "Si manda el mismo reporte con otro nombre —pasa seguido—, la plataforma lo reconoce y no cuenta nada dos veces. También si lo vuelve a guardar o lo exporta a CSV." |
| 0:40–0:55 | Calidad: estrellas del archivo y "8 registros sin persona identificada"; un par "¿Es la misma persona?", dos registros lado a lado, botones Sí / No | "Cada archivo recibe de una a cinco estrellas, como me lo pidió EIRA, y una frase con lo que le falta. Su ID —iniciales más fecha de nacimiento— puede repetirse entre dos personas: el sistema propone el caso y explica por qué; una persona decide. Nunca se une ni se separa solo." |
| 0:55–1:15 | Melenas en Movimiento → Vista previa: donaciones de trenza y entregas de peluca por separado | "Este programa es de otra naturaleza: registra trenzas donadas y pelucas entregadas. Quien dona cabello es donante, no persona impactada —si se contara igual, la cifra saldría inflada. La misma base lo modela porque todo sale de un catálogo: agregar un programa es agregar una entrada." |
| 1:15–1:35 | Global → Vista previa: total de personas como suma de los programas; debajo "N personas aparecen en más de un programa" | "En el Global cada programa suma sus personas: quien está en dos programas cuenta dos veces, y se muestra aparte cuántas se repiten. Las tres cifras que más les piden —personas impactadas, edad promedio, desglose por ciudad— cada una con su fuente y fecha de corte. Conteo exacto sobre conjuntos en Valkey, nada estimado." |
| 1:35–1:45 | Exportar: descargar el informe | "Y el informe sale listo para el aliado." |
| 1:45–1:55 | Cambiar a la versión **con fuentes reales** (si está en línea; si no, se dice) | "Quince segundos de la versión con fuentes reales: defunciones por cáncer de mama y cervicouterino de INEGI y egresos hospitalarios y unidades de salud de la Secretaría de Salud, para Jalisco. Son datos agregados: aquí se ve la unificación y la calidad, no la deduplicación de personas." |
| 1:55–2:00 | Cierre en la portada | "Implementado y simulado están marcados en el README. Lo difícil —no contar dos veces— funciona de verdad." |

## Una frase por juez (si se acercan después)

De `docs/contexto/investigacion-inicial.md` (columna "Qué mostrarle"):

| Juez | Frase |
|---|---|
| Martí Cristobal (BettaTech) | "Le enseño la tabla Implementado/Simulado y las tres capas de deduplicación con sus pruebas: lo generado por IA tiene ingeniería detrás." |
| Roberto Luna Rojas (Valkey, AWS) | "Cada cifra sale de `SCARD`/`SINTERCARD` sobre conjuntos que escribe el motor; Valkey es la cola y la memoria de duplicados, no un caché." |
| Valeria Rivera Contreras (Nutanix, CNCF) | "Ningún nombre ni ID sale del Excel a las bases: solo identificadores opacos, formatos abiertos y un despliegue que corre en una laptop." |
| Gael Hernández (Cognition) | "El README enlaza la auditoría que un agente de Devin hizo de nuestra sesión y las cinco revisiones del plan; el código se construyó por ramas con Devin." |
| Ximena Cruz (Nerdearla) | "Le cuento el recorrido desde la persona que lo usa: sube dos Excel y sale el informe, sin tocar una fórmula." |
| Jazmin Reyes Serrano | "Me apego a la guía: conteo exacto, límites de medición visibles y ninguna deduplicación estimada presentada como cifra oficial." |

## Plan B — video de respaldo

- Grabar **antes de las 15:00** un recorrido del guion (90 s máximo) en la versión
  en blanco, con el mismo texto, y subirlo como video del proyecto en Devpost.
- Si falla el internet o el despliegue: se pone el video y el pitch se dice igual;
  la tabla Implementado/Simulado del README sirve de apoyo visual en el laptop.
- Si falla hasta el video: capturas en `docs/capturas/` + el README abierto en el
  repositorio local.
- Lo que **no** se hace en plan B: fingir que algo funciona en vivo si no funciona.
  Si Melenas no tiene archivo real para subir, se dice que su informe sale de la
  semilla; nunca se presenta como carga en vivo.
