# Reportes: borrador y edición guardada

**«Generar reporte» publica una edición.** Abrir una plantilla o descargar su vista previa no guarda nada. Desde el Tablero, «Sacar reporte» lleva los filtros a las dos plantillas del historial. Al generar, la edición aparece primero en **Reportes generados** con sus botones **Abrir**, **PDF** y **CSV**.

La edición conserva el tipo, la selección, la hora de generación, el corte y la huella de fuentes, las cifras agregadas y los bytes de los dos archivos. El PDF y el CSV se crean con la misma foto. Una carga posterior no recalcula ediciones anteriores. El aviso de datos nuevos compara la revisión general de las fuentes procesadas; no significa que hayan cambiado necesariamente las cifras del municipio elegido.

## Operación

- Estas son claves internas del lector web, no una nueva obligación para el trabajador: `eira:reporte:<uuid>` (hash con `edicion`, `portada`, `pdf`, `csv`) y `eira:reportes` (índice ordenado por milisegundos de generación). No se reutiliza `eira:informe:<alcance>`, que contiene el progreso de la carga.
- La foto contiene agregados y referencias opacas de fuentes; no se archivan nombres de personas, iniciales, filas individuales, responsables ni nombres originales de archivos. Los recuentos pequeños se reservan al publicarse.
- El borrador tiene caducidad. La transacción que incorpora la edición al historial guarda ambos documentos y elimina la caducidad. Si falla la impresión, la interfaz muestra el error y no presenta una edición incompleta.
- Pasar a `next start` el mismo `PORT` que usa el servidor. Instalar el Chromium correspondiente a Playwright o indicar `EIRA_CHROMIUM`. Usar el par `VALKEY_URL` y `IMPACTO_DB` del mismo entorno. La permanencia tras reinicios depende de la persistencia de Valkey.
- La carga está habilitada por defecto en `/subir` y `/informe/<programa>/subir`. Solo `EIRA_SOLO_LECTURA=1` desactiva las cargas y la generación de nuevos reportes; como en la vista de consulta anterior, siguen habilitadas las decisiones de pares.

Con datos ficticios y trabajador **aislados**, ejecutar desde `web/`: `E2E_DEMO_AISLADO=1 E2E_BASE=<origen> npx playwright test e2e/ediciones-guardadas.spec.ts`. La prueba usa un selector de archivos real, carga un CSV, abre las ediciones y compara los SHA-256 antes y después. Requiere `pdftotext` para comprobar que el PDF descargado es legible.
