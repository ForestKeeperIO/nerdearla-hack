# Guion del demo · 2 minutos, 4 pasos

Definido por Ian el 21 nov. Sustituye al guion anterior. Datos ficticios; ningún paciente real.

**Archivo que se sube en vivo:** `reportes/demo/jornada-nueva-chapala.xlsx` (35 filas, formato de Tamizaje Rosa). No se ha cargado en la base en vivo: debe ser nuevo durante el demo.

## Cifras esperadas

Comprobadas el 21 nov, 14:58 CDMX, cargando el archivo en una copia aislada con los mismos tres archivos que tiene la base en vivo (`tamizaje-rosa.xlsx`, `melenas-en-movimiento.xlsx`, `tamizaje-rosa_v2.xlsx`).

| Qué | Antes | Después de subir Chapala |
|---|---|---|
| Personas impactadas (suma por programa) | 108 | **138** |
| Tamizaje Rosa | 92 | **122** |
| Melenas en Movimiento | 16 | 16 |
| Donantes de cabello | 51 | 51 |
| Municipios con actividad | 6 | **7** (aparece Chapala, 33 registros) |
| Pares por revisar | 4 | **6** |
| Archivos | 3 | 4 |

Mensaje del archivo: «Se agregaron 33 filas; 2 ya estaban en otros reportes y se omiten.» Calificación: 5 estrellas.

Qué trae el archivo: 30 personas nuevas de Chapala; 3 filas de personas que ya existen (mismo ID): dos con el nombre escrito distinto, que piden decisión, y una que solo cambia un acento, que el sistema reconoce sola; 2 filas idénticas a filas ya cargadas, que se omiten.

## Paso a paso

| Tiempo | Clic | Se ve | Se dice |
|---|---|---|---|
| 0:00–0:25 | **Tablero**. En los filtros: Estado «Jalisco», luego Programa «Tamizaje Rosa»; después quitar el programa | Con Tamizaje Rosa: 92 personas. Sin filtro: 108 personas, 6 municipios, 51 donantes; mapa y gráficas cambian | «Presidencia de EIRA junta a mano los Excel de cada coordinación. Aquí ya están juntos: 108 personas impactadas en 6 municipios. Las donantes de cabello se cuentan aparte, no inflan la cifra.» |
| 0:25–0:55 | **Subir archivos** → Tamizaje Rosa → arrastrar `jornada-nueva-chapala.xlsx` | «Se agregaron 33 filas; 2 ya estaban en otros reportes y se omiten.» 5 estrellas | «Llega el reporte de una jornada nueva en Chapala. El sistema dice en palabras qué pasó: 33 filas nuevas y 2 que ya teníamos y no se cuentan dos veces.» |
| 0:55–1:20 | Volver a **Tablero** (o «Actualizar») | 138 personas, 7 municipios, Chapala en el mapa, 6 pares por revisar | «El tablero ya lo refleja: 138 personas y un municipio nuevo. Y avisa: dos personas de Chapala tienen el mismo ID que alguien ya registrado, con otro nombre. El sistema no las une ni las separa solo: lo decide una persona.» |
| 1:20–1:50 | **Sacar reporte** → «Impacto para aliados estratégicos» → descargar. Luego «Territorial para gobierno y hospitales» → descargar | Los dos reportes con la selección del tablero; PDF y CSV | «Con esos mismos datos salen dos reportes: uno para aliados estratégicos y otro territorial, para gobierno y hospitales. Cada cifra dice de qué archivos sale y con qué fecha de corte.» |
| 1:50–2:00 | — | — | «Motor en Python, Valkey para las colas, las huellas y el conteo exacto de personas, y tableros de Metabase. Los datos de persona van seudonimizados.» |

## Antes de empezar

- La base en vivo debe estar en el estado previo: 108 personas, 6 municipios, 3 archivos.
- Para repetir el ensayo, en el servidor: `bash ~/projects/.demo-eira/reiniciar-demo.sh`. Detiene el motor, repone Valkey y la base SQLite desde la copia tomada antes del demo (`scripts/ensayo_demo.py`) y lo vuelve a arrancar. Después, pulsar «Actualizar» en el tablero.

## Sin comprobar

- El paso 4 (sección de reportes y sus descargas) y el aviso de datos nuevos del paso 3 dependen de trabajo del frontend que seguía en curso al escribir esto.
- La carga del archivo se comprobó contra el motor en una copia aislada, no por la pantalla de Subir de la versión desplegada.
- El comando de reinicio se probó en la copia aislada (guardar, dañar, restaurar: mismas cifras); no se ha ejecutado contra la base en vivo.
