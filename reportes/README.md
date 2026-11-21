# Reportes de prueba (ficticios)

Datos 100 % inventados para probar el motor de consolidación de EIRA.
Se regeneran con `uv run python scripts/generar_reportes.py` (determinista).
El programa de cada archivo es el `id` de la iniciativa en
`catalogos/iniciativas.json`; la "unidad" es un tipo de registro del catálogo.

| Archivo | Programa / unidad | Qué prueba |
|---|---|---|
| `tamizaje-rosa.xlsx` | tamizaje-rosa · atencion | 120 asistencias, 6 inasistencias, 4 filas repetidas; anomalías: 3 fechas inválidas, 2 ciudades desconocidas, 3 ID inválidos, 8 filas sin ID |
| `melenas-en-movimiento.xlsx` | melenas-en-movimiento · segun_fila | 80 filas: 60 "Donación de trenza" (rol donante) y 20 "Entrega de peluca" (rol beneficiaria), decididas por la columna Tipo; título en la fila 1, encabezados en la fila 3, fila TOTAL al final; 12 sin ID, 2 fechas futuras, 2 ciudades con alias (Ciudad Guzmán / Cd. Guzmán → Zapotlán el Grande) |
| `nutricion.xlsx` | comunidades-de-origen · atencion | 40 asistencias: 30 filas idénticas a tamizaje (traslape entre coordinaciones) y 10 nuevas |
| `reporte_final_2.xlsx` | — | Copia byte a byte de tamizaje: nivel `identico` |
| `tamizaje-rosa-reguardado.xlsx` | — | Mismas celdas, columnas reordenadas: nivel `mismo_contenido` |
| `tamizaje-rosa.csv` | — | Exportación a CSV: nivel `mismo_contenido` |
| `tamizaje-rosa_v2.xlsx` | — | Tamizaje más 8 asistencias nuevas: nivel `version_nueva` |

Entre archivos: 15 personas con el mismo ID en los dos programas del demo
(cruce = 15; donaron cabello y además fueron atendidas), 2 pares con el mismo
ID y personas distintas (colisión de iniciales + fecha) y 3 personas con el
nombre escrito distinto (mismo ID, variante).

`esperado.json` se calcula al construir los datos, no al leerlos:
`archivos.<nombre>` trae `filas, asistencias, inasistencias, sin_id,
repetidas_dentro, anomalias` (y en melenas `donaciones`, `entregas`,
`fechas_futuras`); `globales` trae las cifras del caso de la guía,
`impactadas` y `donantes` por iniciativa y `totales_finales` para la
verificación de la secuencia completa (128 atenciones, 60 donaciones,
20 pelucas, 171 personas, 5 pares pendientes, 126 impactadas en el global y
15 personas en más de un programa). `edad_promedio` es la media de edad de
las personas con ID al 2026-11-21.
