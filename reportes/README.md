# Reportes de prueba (ficticios)

Datos 100 % inventados para probar el motor de consolidación de EIRA.
Se regeneran con `uv run python scripts/generar_reportes.py` (determinista).

| Archivo | Programa / unidad | Qué prueba |
|---|---|---|
| `tamizaje-rosa.xlsx` | Tamizaje Rosa · atención | 120 asistencias, 6 inasistencias, 4 filas repetidas; anomalías: 3 fechas inválidas, 2 ciudades desconocidas, 3 ID inválidos, 8 filas sin ID |
| `salud-que-florece.xlsx` | Salud que Florece · participación | 80 asistencias, 4 inasistencias; título en la fila 1, encabezados en la fila 3, fila TOTAL al final; 12 sin ID, 2 fechas futuras |
| `nutricion.xlsx` | Nutrición · atención | 40 asistencias: 30 filas idénticas a tamizaje (traslape entre coordinaciones) y 10 nuevas |
| `reporte_final_2.xlsx` | — | Copia byte a byte de tamizaje: nivel `identico` |
| `tamizaje-rosa-reguardado.xlsx` | — | Mismas celdas, columnas reordenadas: nivel `mismo_contenido` |
| `tamizaje-rosa.csv` | — | Exportación a CSV: nivel `mismo_contenido` |
| `tamizaje-rosa_v2.xlsx` | — | Tamizaje más 8 asistencias nuevas: nivel `version_nueva` |

Entre archivos: 15 personas con el mismo ID en los dos primeros (cruce = 15),
2 pares con el mismo ID y personas distintas (colisión de iniciales + fecha)
y 3 personas con el nombre escrito distinto (mismo ID, variante).

`esperado.json` se calcula al construir los datos, no al leerlos:
`archivos.<nombre>` trae `filas, asistencias, inasistencias, sin_id,
repetidas_dentro, anomalias`; `globales` trae las cifras del caso de la guía
(120 + 80 con cruce de 15) y `totales_finales` para la verificación de los
siete archivos seguidos (138 atenciones, 80 participaciones, 181 personas,
5 pares pendientes). `edad_promedio` es la media de edad de las personas con
ID al 2026-11-21.
