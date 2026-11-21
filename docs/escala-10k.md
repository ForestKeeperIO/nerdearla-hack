# ¿Qué pasa al subir 10.000 filas de Tamizaje Rosa?

**El archivo se aceptó en 67 ms y el worker terminó en 43,02 s.** La fuente apareció en la copia de lectura del Tablero a los **48,04 s** desde la cola. El Tablero respondió en **522 ms** y el CSV en **433 ms** con las mismas **15.090 personas**: el acumulado de los archivos de 1K, 5K y 10K, no las filas del último Excel. Son mediciones de una corrida local, no una promesa de latencia.

**50.000 filas también llegaron, pero no en tiempo interactivo:** 13 min 0,66 s de procesamiento y otros 79,05 s hasta que se publicó el Atlas. No fallaron por tamaño ni por falta de memoria. La primera mejora que conviene probar es un índice en SQLite, no ampliar Valkey.

## Costo de cada carga

Cada fila de la tabla es **un archivo nuevo** procesado sobre el historial anterior, por el mismo worker. La latencia va desde `XADD` hasta observar `estado=listo`; excluye el POST. CPU es tiempo de usuario + sistema del worker; el porcentaje es la media respecto de un núcleo. RSS es el máximo observado en esa carga. Disco y Valkey son tamaños acumulados, en MiB (1.048.576 bytes).

| Filas del XLSX | XLSX (bytes) | Hasta listo (s) | CPU (s; % medio) | RSS pico (MiB) | Valkey antes → con Atlas actualizado (MiB) | `eira.sqlite` (MiB) | Pares nuevos / acumulados |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | 58.107 | 1,23 | 1,11; 90 % | 42,4 | 1,38 → 2,07 | 0,41 | 0 / 0 |
| 5.000 | 270.832 | 6,89 | 6,62; 96 % | 65,9 | 2,18 → 3,44 | 2,30 | 50 / 50 |
| 10.000 | 536.544 | 43,02 | 42,63; 99 % | 93,1 | 3,46 → 6,24 | 6,07 | 100 / 150 |
| 50.000 | 2.662.962 | 780,66 | 776,98; 99,5 % | 304,5 | 6,26 → 19,70 | 25,00 | 496 / 646 |

## Qué llegó a la usuaria

La columna «Atlas» usa el mismo origen de tiempo que «Hasta listo», pero espera a que la fuente exista en el SQLite que lee Next. Después medimos por HTTP en loopback la respuesta **completa**, sin filtros: HTML de `/tablero`, descarga `/tablero/cifras.csv` y `/api/trabajos?alcance=tamizaje-rosa`. No existe `/api/cifras` en este build. Una petición de cada tipo por tamaño; no son percentiles, tiempos de navegador ni tiempos por internet.

| Filas | POST (ms) | Hasta Atlas (s) | Tablero (ms) | CSV de cifras (ms) | API trabajos (ms) | Personas acumuladas (HTML y CSV) | Atenciones acumuladas (CSV) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | 73 | 1,28 | 542 | 71 | 14 | 990 | 990 |
| 5.000 | 30 | 7,90 | 279 | 161 | 25 | 5.690 | 5.940 |
| 10.000 | 67 | 48,04 | 522 | 433 | 20 | 15.090 | 15.840 |
| 50.000 | 51 | 859,71 | 2.474 | 1.849 | 27 | 62.090 | 65.340 |

El control no fue sólo HTTP 200: se leyó `data-kpi="personas"` y el nombre de la nueva fuente en el HTML, se contrastó ese KPI en el CSV y se sumaron los registros de sus seis municipios. La API de trabajos devolvió el identificador de la carga. Un ID presente en dos meses sigue siendo una persona; dos atenciones distintas siguen siendo dos atenciones.

**Límite de subida comprobado:** los cuatro XLSX pasaron el POST y llegaron a `listo`; no hubo timeout HTTP. Un archivo sintético adicional de **10 MiB + 1 byte** recibió HTTP 400 por tamaño y el Stream siguió teniendo exactamente cuatro trabajos. El de 50K pesaba sólo 2,54 MiB.

## Por qué tarda y qué cambiar primero

1. **Indexar la búsqueda de pares en el procesador.** En Selma `13a806d`, `py/procesador/importar.py:191,198-205` hace una consulta por cada ID contado del archivo. En la foto de 16.000 filas, `EXPLAIN QUERY PLAN` para esa consulta da `SCAN filas`: busca en **todo el historial por cada ID**. Los índices de `py/procesador/estado.py:28-29` cubren huella y fuente, no `id_h`. El [pedido a Selma](pedidos-a-selma.md#escala-de-tamizaje-rosa) incluye una comprobación sin cambiar la lógica de identidad.
2. **No confundir «listo» con «publicado».** Durante 10K el exportador perdió la lectura con `sqlite3.OperationalError: database is locked`; durante 50K se registraron otras 85 salidas por bloqueo. La detección de pares corre dentro de la transacción de escritura (`importar.py:173-191`); el adaptador no reintenta ese bloqueo (`db/exportar_selma.py:26,46-48,129-162,173`). Mostrar la última foto con su corte hasta confirmar la fuente; reintentar con espera y preservar la foto anterior, sin reiniciar el proceso por cada contención.
3. **Mantener la subida asíncrona.** El POST ya entrega un ID: consultar el avance en vez de volver a subir el archivo si la pantalla tarda. Probar la mejora con el mismo historial, conteos, pares y exportación antes de anunciar soporte para archivos grandes. No deducir un máximo de filas a partir del peso: Excel comprime y cada archivo tiene columnas y textos distintos.

**Comprobación del diagnóstico:** después de las cargas, copiamos a memoria la foto posterior a 10K (16.000 filas totales). Para los mismos 200 IDs, la consulta de pares tardó **566 ms** sin índice y **1,51 ms** con el índice parcial propuesto (medianas de tres pasadas, SQLite 3.53.1). Cambió de `SCAN filas` a `SEARCH ... (id_h=?)` y devolvió las mismas filas en el mismo orden. Es una medición de la consulta, **no** del rendimiento de una carga con el índice instalado.

## Cómo se midió

- **Aislamiento:** build de Next.js 16.4.6 desde `main` en `b9751fa`, Node 22; worker `python -m procesador.worker` y venv del release `13a806d`; servicio de vistas `db.exportar_selma --eventos`. Valkey 9.2 propio, DB 0, sólo loopback, sin persistencia automática, límite 512 MiB sin expulsión. Estado, llave, Atlas, Metabase y build en directorios de prueba; sin consultas a producción.
- **Recuperación del lector:** tras la primera salida del exportador a 10K, se lo relanzó en la copia. A partir de ahí se replicó `Restart=on-failure`, `RestartSec=3` con un supervisor local; no se arrancó ni reinició una unidad del sistema. Los tiempos del Atlas incluyen esta recuperación y la reconstrucción de la foto.
- **Datos:** [generador reproducible](../scripts/generar-escala.py), semilla `20261121`. Invocar `python scripts/generar-escala.py DIRECTORIO_VACÍO` con `openpyxl`. Escribe cuatro XLSX y un `esperado.json`. Usa los ocho encabezados del demo, IDs ficticios únicos por construcción, fechas distintas por archivo, cuatro servicios y seis municipios de Jalisco. El 1 % de las filas son copias exactas internas. Tras el primer archivo, el 5 % de las filas corresponde a personas de archivos previos (250, 500 y 2.500); algunas cambian sólo de caja/tildes, otras una letra.
- **Circuito:** una petición multipart por archivo a `/api/subir` (`programa=tamizaje-rosa`, `unidad=atencion`, `estado_clave=14`, `fecha_corte=2026-09-30`); verificar que el ID devuelto es el de `eira:trabajos`. Sondear la ficha y `/proc` del worker cada ~200 ms. Para la memoria de Valkey, `INFO memory.used_memory` antes del POST y después de ver la fuente en el Atlas; incluye datos y sobrecarga del servidor, no su RSS ni su pico transitorio. Para los pares, diferencia de `HLEN eira:pares`; para el SQLite privado, bytes del archivo, sin journal ni bases de lectura.
- **Alcance:** VPS compartido de 11 GiB, un archivo en vuelo, sin cargas concurrentes de usuarias, un único programa y un único recorrido. No se midieron filtros, PDF, navegador, red externa ni durabilidad tras reinicio. No se modificaron el procesador ni su esquema para la corrida.
