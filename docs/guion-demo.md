# Guion del pitch — 2 minutos

Sobre la **versión en blanco** del prototipo (empieza sin datos). Los archivos
del demo son los reportes de prueba del caso de la guía; si no llegan a tiempo,
el video de respaldo es el plan A (ver al final).

| Tiempo | En pantalla | Se dice |
|---|---|---|
| 0:00–0:10 | Portada: los tres informes (Tamizaje Rosa, Salud que Florece, Global bloqueado) | "Presidencia de EIRA junta a mano los Excel de cada coordinación cada vez que un donante pide un informe. Esto es lo que ven al entrar: un informe por programa y uno global." |
| 0:10–0:25 | Tamizaje Rosa → Subir: arrastrar `tamizaje-rosa.xlsx`; aparece "Listo: 120 filas" | "Sube el Excel de la coordinación. Sin tecnicismos: el archivo dice en palabras qué pasó." |
| 0:25–0:35 | Calidad: se ven las estrellas del archivo y "8 filas sin ID" | "Cada archivo recibe de una a cinco estrellas, como me lo pidió EIRA, y una frase con lo que le falta." |
| 0:35–0:50 | Subir `reporte_final_2.xlsx` → "Ya se cargó como 'tamizaje-rosa.xlsx'" | "Si manda el mismo reporte con otro nombre —pasa seguido—, la plataforma lo reconoce y no cuenta nada dos veces. También si lo vuelve a guardar o lo exporta a CSV." |
| 0:50–1:10 | En Calidad, un par "¿Es la misma persona?": dos registros lado a lado, botones Sí / No | "El ID de EIRA son iniciales más fecha de nacimiento: puede repetirse entre dos personas. El sistema propone el caso y explica por qué; una persona decide. Nunca se une ni se separa solo." |
| 1:10–1:30 | Vista previa de Tamizaje Rosa y luego el Global: personas impactadas, edad promedio, desglose por ciudad; "X personas están en ambos programas" | "Las tres cifras que más les piden, cada una con su fuente y fecha de corte. Quien está en los dos programas cuenta una sola vez: aquí lo resuelven conjuntos de personas en Valkey, con conteo exacto, no estimado." |
| 1:30–1:40 | Exportar: descargar el informe | "Y el informe sale listo para el aliado." |
| 1:40–1:55 | Cambiar a la versión **con fuentes reales**: mismo producto con datos abiertos de Jalisco | "Quince segundos de la versión con fuentes reales: reportes de cáncer de mama y cervicouterino de INEGI y Secretaría de Salud para Jalisco, procesados por el mismo flujo. Son datos agregados: aquí se ve la unificación y la calidad, no la deduplicación de personas." |
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
