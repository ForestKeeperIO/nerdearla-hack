# Cómo validar Informes que unen

Todos los datos de esta carpeta son **ficticios**: personas, nombres e IDs inventados. Ningún dato real de EIRA. Los archivos se generan de forma determinista con `scripts/generar_reportes.py` en el repositorio.

Código: https://github.com/ForestKeeperIO/nerdearla-hack (MIT)

## Qué hay aquí

| Archivo | Programa | Qué prueba |
|---|---|---|
| `tamizaje-rosa.csv` | Tamizaje Rosa (atenciones) | 120 asistencias, 6 inasistencias, 4 filas repetidas dentro del archivo, 8 filas sin ID, 3 fechas inválidas, 2 ciudades desconocidas, 3 ID inválidos |
| `melenas-en-movimiento.csv` | Melenas en Movimiento | 60 donaciones de trenza (donantes) y 20 entregas de peluca (beneficiarias). Trae título en la fila 1, encabezados en la fila 3 y alias de ciudad (Cd. Guzmán = Zapotlán el Grande) |
| `nutricion.csv` | Comunidades de origen | 40 asistencias: 30 son las mismas filas que Tamizaje Rosa (dos coordinaciones registraron la misma jornada) y 10 son nuevas |
| `tamizaje-rosa_v2.csv` | Tamizaje Rosa | La misma hoja con 8 asistencias nuevas: solo deben entrar las 8 |
| `tamizaje-rosa-reguardado.csv` | Tamizaje Rosa | Las mismas celdas con las columnas en otro orden: debe reconocerse como el mismo contenido |
| `tamizaje-rosa-exportado.csv` y `reporte_final_2.csv` | Tamizaje Rosa | El mismo archivo con otro nombre o exportado: no debe contar dos veces |
| `jornada-nueva-chapala.csv` | Tamizaje Rosa | La "hoja nueva" del demo: 35 atenciones de una jornada. Al subirla, debe subir la cifra y aparecer Chapala en el tablero |

`reportes/` (en este repositorio) tiene los mismos archivos en `.xlsx`. Con `reporte_final_2.xlsx` se prueba la copia byte a byte (nivel `identico`). En CSV esa prueba se convierte en "mismo contenido".

`reportes-reales/` (en este repositorio) tiene datos abiertos oficiales (INEGI y Secretaría de Salud) sobre cáncer de mama y cervicouterino en Jalisco, con su fuente y licencia en el README.

## Recorrido sugerido

1. Sube `tamizaje-rosa.csv` en Tamizaje Rosa. Cuenta 120 asistencias; las 6 inasistencias no cuentan como atención.
2. Sube `reporte_final_2.csv` o `tamizaje-rosa-exportado.csv`. Debe decir que ese archivo ya se cargó y no sumar nada.
3. Sube `tamizaje-rosa_v2.csv`. Solo entran 8 filas nuevas.
4. Sube `melenas-en-movimiento.csv` en Melenas en Movimiento. Las 60 donantes **no** cuentan como personas impactadas; las 20 que recibieron peluca sí.
5. Revisa "Pares por decidir". Ahí deben aparecer los registros con el mismo ID y nombres distintos; el sistema no los une solo.
6. Sube `jornada-nueva-chapala.csv` y mira cómo cambia el tablero.

## Cifras esperadas

Después de la secuencia completa de prueba (`resultados-esperados.json`, campo `totales_finales`):

- 128 atenciones, 60 donaciones y 20 pelucas, siempre por separado y nunca sumadas
- 171 personas en la base, de las cuales 126 son personas impactadas en el informe Global
- 15 personas aparecen en más de un programa; se muestran aparte, sin restarlas
- 5 pares pendientes de decidir por una persona

`resultados-esperados.json` también trae, por archivo, filas, asistencias, inasistencias, filas sin ID, repetidas y anomalías. Estas cifras se calculan al **generar** los datos, no al leerlos, y el motor tiene pruebas automáticas que las comparan.

El demo en línea puede empezar con datos ya cargados. En ese caso, las cifras exactas de arriba se reproducen corriendo el proyecto localmente desde cero (instrucciones en el README del repositorio).

## Para validar con tu IA

Dale esta carpeta (`datos-de-prueba/`) y pídele, por ejemplo:

> Con estos CSV, calcula cuántas personas distintas hay por programa usando la columna ID, cuántas filas están repetidas entre `tamizaje-rosa.csv` y `nutricion.csv`, y qué IDs aparecen con nombres distintos. Compáralo con `resultados-esperados.json`.
