# SPEC-GAPS: lo que pidió EIRA frente a lo que hace `main`

Revisado el 2026-11-21 a las 13:50 CDMX sobre `main` en `563f185` (código leído en `8dae0c3`..`563f185`). Corte de funciones 15:00; Devpost 16:00.

## Fuentes leídas (primarias)

| Clave | Fuente | Cómo se leyó |
|---|---|---|
| **G** | Guía de EIRA, PDF "Tecnología que transforma vidas" (10 páginas, título interno "Desafíos .docx", sha256 `24f2c838…3c64`). Reto 3 en p. 6-7; requisitos transversales y entregables en p. 9 | `pdftotext` página por página. El texto de `docs/contexto/guia-eira.md` coincide con el PDF |
| **D** | Devpost `vibeathon-mexico-2026.devpost.com` (portada y `/rules`) | Copia descargada hoy 17:20 CET por una sesión anterior; **no se volvió a descargar** |
| **N1** | Granola "Data management for social impact", 2026-11-21 11:41 CDMX | Leída hoy por Hermes (MCP de Granola). **Solo resumen de IA**: la transcripción no está disponible en el plan de la cuenta; notas privadas vacías. `docs/contexto/nota-granola-eira.md` coincide con el resumen (solo traduce "template", "preview", "rating") |
| **N2** | Granola "Hackathon development tips", 2026-11-21 10:18 CDMX | Igual: solo resumen |

No se pudo leer: la transcripción de ninguna reunión de Granola, y los Excel de ejemplo de EIRA (N1 dice que se compartirían; no están en el VPS).

## Los 8 huecos, por impacto en el jurado

| # | Hueco | Qué dice la fuente | Qué hace `main` (verificado) | Arreglo más pequeño | Dueño |
|---|---|---|---|---|---|
| 1 | **El Global presenta como "personas impactadas" una suma que cuenta dos veces a quien está en dos programas** | G p. 6: "Riesgo de doble conteo cuando una persona aparece varias veces o en varios programas"; G p. 6-7: "cómo calcularía un total de beneficiarias únicas". D, criterio Impacto: "¿Resuelve los problemas centrales del reto elegido tal como los describe la guía?" | `vista-previa/page.tsx`, `exportar/page.tsx` e `informe.csv/route.ts`: `totalImpactadas = suma por programa`; la cifra única (`idsUnicos.length`) ya se calcula pero solo se usa para edad y ciudad. Es decisión de Ian (STATE 13:12), **contradice la guía** | Mostrar `idsUnicos.length` como cifra principal "personas únicas" y dejar la suma al lado como "participaciones por programa (una persona en dos programas cuenta dos)". Igual en CSV: fila `personas_unicas`. Son 3 archivos, sin tocar el motor. Si Ian mantiene la suma, cambiar el rótulo a "participaciones" y no llamarla "personas" | Claude (main) + Devin (rótulos) |
| 2 | **El tablero de Metabase incrustado apunta a `http://127.0.0.1:3200`** | D, criterio Funcionamiento real: "¿El flujo crítico funciona de punta a punta?"; G p. 6: "Mostrar indicadores y gráficos pertinentes" | `metabase/enlaces.json` (9 URL locales) lo lee `vista-previa/page.tsx` y lo pone en un `<iframe>`. En el navegador del jurado, o bajo HTTPS, queda en blanco | Publicar Metabase por el mismo túnel/HTTPS y reescribir `enlaces.json`; si no llega a las 15:00, borrar `enlaces.json` del entorno en línea (la pantalla ya funciona sin él) y enseñar Metabase en local | Trabajador de Metabase |
| 3 | **El mapeo de columnas no se ve** | G p. 6: "Importar archivos… con columnas heterogéneas y mapearlas a un modelo común"; G p. 7, qué demostrar: "mapeo de campos" | El motor lo calcula y lo guarda (`worker.py:278`, campo `mapeo` con encabezado, campo y probabilidad). Ninguna pantalla lo lee (`grep mapeo web/` = 0) | En Calidad, bajo cada archivo, un desplegable "Cómo se leyeron las columnas": encabezado original → campo. Solo lectura del hash que ya existe | Devin (fe) |
| 4 | **No hay filtros por periodo, municipio ni tipo de servicio en la interfaz** | G p. 6: "Construir filtros por programa, periodo, municipio y tipo de servicio cuando existan datos" | Solo se filtra por programa (el alcance). `web/lib/datos.ts` ya trae `Filtros` con periodo y servicio y `valoresDe()`, sin uso en pantallas | Lo mínimo: filtros en el tablero de Metabase (programa, periodo, municipio, servicio) y decirlo en el pitch. Mejor: dos `<select>` en Vista previa que pasen `?periodo=&servicio=` a `filtrosDe` | Trabajador de Metabase; Devin si hay tiempo |
| 5 | **La bitácora de ajustes manuales existe pero no se muestra ni se exporta** | G p. 6: "Exportar un resumen o reporte y conservar trazabilidad de ajustes manuales" | `leerBitacora()` en `web/lib/datos.ts` no se llama desde ninguna página; el CSV no trae decisiones ("Contar de todos modos", "es la misma persona") | En Exportar, sección "Ajustes hechos a mano" (últimas entradas de `eira:bitacora`) y las mismas filas al final del CSV | Devin (fe) |
| 6 | **"Cómo se calculó" enseña un comando de Valkey, no la regla** | G p. 6: "Necesidad de explicar de dónde proviene cada indicador y cómo se calculó"; "con fecha de corte, denominador y fuente". D, Usabilidad: "clara… distintos niveles de familiaridad digital" | `web/components/como.tsx` muestra `SINTERCARD …` y milisegundos. Fuente y corte sí salen en la bajada; el denominador solo en edad ("n con fecha de nacimiento") | Añadir una frase en español antes del comando (la `definicion` que ya escribe el CSV) y el denominador ("de N registros, M con persona identificada"). El comando se queda para el juez de Valkey | Devin (fe) |
| 7 | **Sin plantilla de informe por audiencia ni preguntas adicionales** | N1: "Preguntas varían por aliado; se necesita un template base con opción de preguntas adicionales"; "Identificar los 2 reportes más importantes y sus audiencias. Ejemplo concreto: Tamizaje Rosa para socios estratégicos" | Un solo formato de informe; `grep plantilla web/` = 0 | No construir. Decirlo en el pitch y en el README como siguiente paso, y nombrar el informe de Tamizaje Rosa "para socios estratégicos" en Exportar | Claude (main, README) |
| 8 | **El Excel crudo, con nombres, vive una hora en Valkey; y una prueba del motor falla en la corrida completa** | G p. 7: "Los tableros no deben exponer información personal innecesaria"; G p. 9: "minimizar datos recolectados". `docs/devpost.md` afirma "ninguna base guarda nombres" | `api/subir/route.ts:69`: `SET eira:archivo:<id> … EX 3600`; el motor no lo borra. Aparte: `pytest py db scripts` dio 38 en verde y 1 fallo (`test_version_nueva_solo_agrega_lo_nuevo`); sola, pasa. Causa **SIN VERIFICAR** (parece estado compartido entre pruebas) | `DEL eira:archivo:<id>` al terminar el trabajo en `worker.py`, o corregir la frase de Devpost a "tras procesar". Correr la prueba aislada con base limpia antes de citar "pruebas en verde" | Claude (main, motor) |

Cubierto y verificado en `main` (no son huecos): tres cifras de N1 (personas, edad promedio, ciudad); estrellas por archivo; recorrido Subir → Calidad → Vista previa → Exportar; tipos de registro sin sumar entre sí; rango cuando hay registros sin identificar; pares "¿misma persona?" decididos por una persona; caso de la guía (120 atenciones en `tamizaje-rosa.xlsx`, 80 participaciones en `melenas-en-movimiento.xlsx`); exportación CSV; valores menores a 5 ocultos.

## Entrega en Devpost: qué falta

Requisitos de D frente a `docs/devpost.md` y `docs/lista-de-entrega.md`:

| Requisito de Devpost | Estado |
|---|---|
| Repositorio público con licencia abierta | Cumplido y verificado: `ForestKeeperIO/nerdearla-hack` es PUBLIC, licencia MIT. La lista lo trae sin marcar |
| README: cómo levantarlo y qué credenciales o servicios necesita | Presente en `main`. No ejecuté los pasos desde cero: **SIN VERIFICAR** |
| Implementado frente a simulado; riesgos, seguridad, operación, costos, próximos pasos; preguntas abiertas | Secciones presentes en el README. La tabla Implementado/Simulado está **desactualizada**: dice "rama `fe`", "rama `motor`", "24 pruebas", "pendiente de incrustar"; todo eso ya está en `main` y hoy son 39 pruebas |
| Demo pitch de 2 minutos | `docs/guion-demo.md` existe. La lista pide un video de 90 s: sin evidencia de que esté grabado |
| Indicar el reto en el formulario | En la lista, sin marcar |
| Todos los integrantes registrados en Nerdearla y Devpost, y en el proyecto | En la lista, sin marcar. **`docs/devpost.md` no nombra al equipo** |
| Enviado antes de las 16:00 | Pendiente |
| Construido el 21 de noviembre de 10:30 a 16:00 | Cumplido: el primer commit (`866628a`) es de hoy a las 11:25 CDMX |
| Demo en vivo (guion sobre la versión en blanco) | A las 13:55 CDMX `:3100` (blanco) **no escucha**; `:3101` (real) y Metabase `:3200` responden 200. URL públicas: **SIN VERIFICAR** |

Correcciones al texto de `docs/devpost.md` antes de pegarlo:

1. "Nos lo dijeron… Su visión, **textual**": no hay transcripción, solo el resumen de Granola. Cambiar a "según nuestras notas de la conversación".
2. "ninguna base guarda nombres": falso durante una hora (hueco 8).
3. "24 pruebas en verde" y "rama `fe`": desactualizado.
4. "Lo que falta — … el bloque de presencia y los tableros incrustados": ya están en `main`; lo que falta es que Metabase sea alcanzable (hueco 2).
5. "En el Global el total de personas es la suma": es justo el hueco 1; reescribir según lo que decida Ian.
6. Devpost no pide URL en línea; sí la pide la lista interna. Si no hay URL estable a las 15:20, enviar con repositorio y video.
