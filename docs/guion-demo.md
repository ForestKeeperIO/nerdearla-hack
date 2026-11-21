# Guion del demo · 2 minutos, 4 pasos

Definido por Ian el 21 nov. Sustituye al guion anterior. Datos ficticios; ningún paciente real.

**Archivo que se sube en vivo:** `reportes/demo/jornada-nueva-chapala.xlsx` (35 filas, formato de Tamizaje Rosa). No se ha cargado en la base en vivo: debe ser nuevo durante el demo.

## Cifras esperadas

Comprobadas el 21 nov, 15:58 CDMX, con el procesador de Selma en una copia aislada: primero sus cuatro archivos base (`py/datos_demo/archivos/`: Tamizaje, su versión 2, Nutrición y Melenas) y después la hoja de Chapala. La base en vivo quedó reiniciada a ese mismo punto de partida.

| Qué | Antes | Después de subir Chapala |
|---|---|---|
| Personas impactadas (suma por programa) | 150 | **180** |
| Tamizaje Rosa | 130 | **160** |
| Melenas en Movimiento | 20 | 20 |
| Donantes de cabello | 40 | 40 |
| Municipios con actividad | 6 | **7** (aparece Chapala) |
| Pares por revisar | 2 | **5** |
| Archivos | 4 | 5 |

Mensaje del archivo: «Se agregaron 33 filas; 2 ya estaban en 'tamizaje-rosa.xlsx' y se omiten. Revísalas en Calidad.» Calificación: 5 estrellas.

Qué trae el archivo (también en CSV, misma carpeta): 30 personas nuevas de Chapala; 3 filas de personas que ya existen (mismo ID, nombre escrito distinto), que piden decisión; 2 filas idénticas a filas ya cargadas, que se omiten.

## Paso a paso

| Tiempo | Clic | Se ve | Se dice |
|---|---|---|---|
| 0:00–0:25 | **Tablero**. En los filtros: Estado «Jalisco», luego Programa «Tamizaje Rosa»; después quitar el programa | Con Tamizaje Rosa: 130 personas. Sin filtro: 150 personas, 6 municipios, 40 donantes; mapa y gráficas cambian | «Presidencia de EIRA junta a mano los Excel de cada coordinación. Aquí ya están juntos: 150 personas impactadas en 6 municipios. Las donantes de cabello se cuentan aparte, no inflan la cifra.» |
| 0:25–0:55 | **Subir archivos** → Tamizaje Rosa → arrastrar `jornada-nueva-chapala.xlsx` | «Se agregaron 33 filas; 2 ya estaban en 'tamizaje-rosa.xlsx' y se omiten.» 5 estrellas | «Llega el reporte de una jornada nueva en Chapala. El sistema dice en palabras qué pasó: 33 filas nuevas y 2 que ya teníamos y no se cuentan dos veces.» |
| 0:55–1:20 | Volver a **Tablero** (o «Actualizar») | 180 personas, 7 municipios, Chapala en el mapa, 5 pares por revisar | «El tablero ya lo refleja: 180 personas y un municipio nuevo. Y avisa: tres personas de Chapala tienen el mismo ID que alguien ya registrado, con otro nombre. El sistema no las une ni las separa solo: lo decide una persona.» |
| 1:20–1:50 | **Sacar reporte** → «Impacto para aliados estratégicos» → descargar. Luego «Territorial para gobierno y hospitales» → descargar | Los dos reportes con la selección del tablero; PDF y CSV | «Con esos mismos datos salen dos reportes: uno para aliados estratégicos y otro territorial, para gobierno y hospitales. Cada cifra dice de qué archivos sale y con qué fecha de corte.» |
| 1:50–2:00 | — | — | «Motor en Python, Valkey para las colas, las huellas y el conteo exacto de personas, y tableros de Metabase. Los datos de persona van seudonimizados.» |

## Archivos de Ian

Dos archivos ficticios, distintos de la hoja de `reportes/demo/`:

- `jornada-nueva-chapala.csv`: Tamizaje Rosa, 35 atenciones (33 en Chapala, 1 en Tapalpa y 1 en Sayula). Es el mismo archivo que `datos-de-prueba/jornada-nueva-chapala.csv`.
- `prueba-mapeo-excel01.xlsx`: **Melenas en Movimiento**. Tiene un título en las filas 1 y 2, los encabezados en la fila 3 y una fila TOTAL al final. Trae 30 movimientos: 23 donaciones de cabello (54 trenzas en total) y 7 pelucas entregadas. Es el mismo archivo que `datos-de-prueba/prueba-mapeo-excel01.xlsx`.

**Ninguno repite filas ni personas de la base de Selma.** El CSV de Chapala se hizo para la base del motor anterior (`datos-de-prueba/tamizaje-rosa.csv`), donde sí existen REM19820406 y PEM19701222. Sobre la base limpia de 150 personas, sus 35 ID son nuevos. Por eso estos dos archivos no producen filas omitidas ni pares nuevos. Para mostrar que nada se cuenta dos veces, se vuelve a subir el mismo CSV (paso 3 de la tabla de abajo). La hoja de `reportes/demo/` es la que trae filas omitidas y pares.

En los dos archivos el mismo nombre aparece con dos ID distintos (Ofelia Sofía Quintero en el CSV; cinco nombres en el Excel). Se cuentan como personas distintas, porque el ID de EIRA lleva la fecha de nacimiento. El sistema no une personas solo por el nombre.

### Cifras comprobadas

21 nov, 16:20 CDMX, en una copia aislada (Valkey y estado propios) de `main@944a01b` + `demo-archivos`, con el procesador de Selma. Las cargas se hicieron por la pantalla de Subir en Chromium sin ventana. Las cifras son las de Valkey (`eira:met:*`) y el Tablero mostró las mismas.

| Qué | Base limpia | Solo Chapala | Solo Excel | Los dos, en cualquier orden |
|---|---|---|---|---|
| Personas impactadas (suma por programa) | 150 | **185** | **157** | **192** |
| Tamizaje Rosa | 130 | 165 | 130 | 165 |
| Melenas en Movimiento (reciben peluca) | 20 | 20 | 27 | 27 |
| Personas únicas entre programas | 130 | 165 | 137 | 172 |
| Donantes de cabello (no suman al titular) | 40 | 40 | 63 | 63 |
| Atenciones | 165 | 200 | 165 | 200 |
| Donaciones recibidas (trenzas) | 60 | 60 | 107 | 107 |
| Productos entregados (pelucas) | 20 | 20 | 27 | 27 |
| Municipios con actividad | 6 | **7** (Chapala, 33 registros) | 6 | 7 |
| Pares por revisar | 2 | 2 | 2 | 2 |
| Archivos | 4 | 5 | 5 | 6 |

### Chapala (CSV), clic por clic

| Clic | Se ve | Se dice |
|---|---|---|
| **Subir archivos** → **Tamizaje Rosa** → arrastrar `jornada-nueva-chapala.csv` | «Revisión de encabezados»: ID, Nombre, Estudio, Edad, Ciudad, Asistencia y Fecha, cada uno al 100 %. No aparece aviso de programa. | «Antes de enviar ya vemos cómo se lee cada columna.» |
| **Subir 1 archivo** | En unos 2 s: «Listo · 35 filas nuevas, 0 omitidas, 0 pares detectados con esta carga.» Debajo: «Se agregaron 35 filas.» 5 / 5 estrellas | «35 atenciones nuevas de una jornada en Chapala, con calificación de calidad 5 de 5.» |
| Volver a arrastrar el mismo CSV → **Subir 1 archivo** | «Duplicado · ya se cargó». «Este archivo ya se cargó el 21 nov como 'jornada-nueva-chapala.csv'. No se vuelve a cargar.» Las cifras no cambian | «Si alguien lo manda otra vez, no se cuenta dos veces.» |
| **Tablero** | 185 personas, 7 municipios. Chapala aparece en el mapa y al final de «Por municipio», con 33 registros. La carga encabeza «Cargas recientes». En «Actividad mensual», septiembre pasa de 31 a 64 | «Sube la cifra y aparece un municipio nuevo.» |
| **Revisar calidad** (Tamizaje Rosa) | `jornada-nueva-chapala.csv` al 100 %, 5 / 5. Siguen los 2 pares de la base | — |

### Mapeo (Excel de Melenas), clic por clic

| Clic | Se ve | Se dice |
|---|---|---|
| **Subir archivos** → **Melenas en Movimiento** → arrastrar `prueba-mapeo-excel01.xlsx` | Los encabezados son distintos a los de la base: «Nombre de la participante» → Nombre, «Id Eira» → ID de EIRA, «Municipio de residencia» → Ciudad o municipio, «Tipo de movimiento» → Tipo de registro, «Fecha de la jornada» → Fecha, «Número de trenzas» → Cantidad. Todos al 100 %. El título de arriba y la fila TOTAL no estorban | «Cada coordinación escribe sus columnas a su manera. El sistema las reconoce sin plantilla.» |
| **Subir 1 archivo** | «Listo · 30 filas nuevas, 0 omitidas, 0 pares detectados con esta carga.» Debajo: «Se agregaron 30 filas. Se excluyó 1 fila de totales.» 5 / 5 | «Ignora la fila de totales, para no contarla como si fuera una persona.» |
| **Tablero** → Programa «Melenas en Movimiento» | 27 personas impactadas (las 7 pelucas nuevas), 63 donantes aparte. En «Servicios por unidad»: 107 donaciones recibidas y 27 productos entregados. Siguen 6 municipios | «Quien recibe una peluca es beneficiaria y cuenta. Quien dona cabello es donante: se reporta, pero no infla la cifra de impacto.» |

Si se elige Tamizaje Rosa por error, aparece «Este archivo parece de Melenas en Movimiento. ¿Cambiar?» y el botón de subir queda desactivado. Pulsar **Cambiar a Melenas en Movimiento**: el archivo pasa a esa página sin volver a elegirlo. **No pulsar «Conservar Tamizaje Rosa».** Si se pulsa, el archivo entra como 30 atenciones con 1 estrella, y luego Melenas lo rechaza como duplicado (ver `pedidos-a-selma.md`, «Archivo cargado en el programa equivocado»). Solo se corrige reiniciando la base.

Antes de cada ensayo hay que reiniciar a la base limpia. Si no, el segundo intento de cada archivo sale como «Duplicado · ya se cargó».

Capturas en `docs/evidencia/archivos-ian/`.

## Antes de empezar

- La base en vivo debe estar en el estado previo: 150 personas, 6 municipios, 4 archivos.
- Para repetir el ensayo, en el servidor: `bash ~/projects/.demo-eira/reiniciar-demo-selma.sh`. Guarda el estado actual en un respaldo, vacía las claves `eira:*`, arranca el procesador con estado nuevo y vuelve a cargar los cuatro archivos base por la API de la aplicación. Imprime las cifras del procesador y de Metabase (150 y 40). Los reportes guardados se borran con el reinicio.

## Sin comprobar

- La hoja nueva se probó contra el procesador en una copia aislada, no por la pantalla de Subir. La pantalla de Subir en producción sí se probó con otro archivo de Chapala y envió bien el tipo de registro.
- El paso 4 (generar y descargar los dos reportes) no se recorrió completo con esta base.
