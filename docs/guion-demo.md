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

## Antes de empezar

- La base en vivo debe estar en el estado previo: 150 personas, 6 municipios, 4 archivos.
- Para repetir el ensayo, en el servidor: `bash ~/projects/.demo-eira/reiniciar-demo-selma.sh`. Guarda el estado actual en un respaldo, vacía las claves `eira:*`, arranca el procesador con estado nuevo y vuelve a cargar los cuatro archivos base por la API de la aplicación. Imprime las cifras del procesador y de Metabase (150 y 40). Los reportes guardados se borran con el reinicio.

## Sin comprobar

- La hoja nueva se probó contra el procesador en una copia aislada, no por la pantalla de Subir. La pantalla de Subir en producción sí se probó con otro archivo de Chapala y envió bien el tipo de registro.
- El paso 4 (generar y descargar los dos reportes) no se recorrió completo con esta base.
