# Tablero: del corte de una hoja al reporte

Se repite la misma selección en cada captura: Tamizaje Rosa, tres municipios, Exploración clínica y febrero–octubre de 2026. El resultado del motor es **31 personas, 36 filas y 3 municipios**. No son tres maneras de contar lo mismo.

| Versión | Escritorio, 1440 × 900 | Móvil, 390 × 844 |
|---|---|---|
| V2 rechazada: catorce fichas | [Antes](capturas/v2-tablero-1440.png) | [Antes](capturas/v2-tablero-390.png) |
| Atlas funcional antes de la dirección B | [Atlas](capturas/antes-bento-1440.png) | [Atlas](capturas/antes-bento-390.png) |
| Primer bento, todavía con cabecera propia (desarrollo) | [Intermedio](capturas/bento-tablero-1440.png) | [Intermedio](capturas/bento-tablero-390.png) |
| Bento compartido con Reportes (producción) | [Después](capturas/v3-tablero-1440.png) | [Después](capturas/v3-tablero-390.png) |

## Una sola interfaz

El Tablero usa la cabecera `eira-mastil`, la navegación `eira-nav` y las tarjetas `resumen-bento`, `respuesta` y `dato-bento` de Reportes. Las reglas compartidas viven en `web/app/bento.css` y `web/app/expediente.css`. `atlas.css` organiza el mapa, los filtros y los desgloses; no vuelve a definir el nav. El botón circular abre el método de cálculo en lugar de navegar al método del informe.

| Revisión | Qué se comprobó |
|---|---|
| High-end visual design | Composición asimétrica de Donezo y QClay. Los chips comparan ventanas de igual duración; «Sin periodo previo» no implica un cambio de cero. El rayado identifica datos faltantes o pares por decidir. |
| Hallmark, render en Chromium | Se comprobaron navegación, contraste, solapamiento y movimiento reducido. A 1440, los indicadores terminan a 577 px de la parte superior. A 390 aparece «Filtros (4)» sin desplazamiento horizontal. A 375, el nombre «Subir archivos» necesitaba el mismo ajuste de fila que en los móviles más estrechos; el corte se amplió en la cabecera compartida. |
| Impeccable | El detector no señaló hallazgos en la hoja del bento, el Tablero, su cabecera y las acciones de reporte. |
| Modern Web Guidance (`dialog`) | La hoja móvil usa `showModal()` y el navegador gestiona el foco. Chromium verificó el retorno a «Filtros» al cerrar, la selección del mes de corte y la limpieza de la URL. |

**Comprobación visual:** se compararon estilos calculados, no nombres de clases, en el Tablero y el informe abierto de aliados. En ambos: Geist cargada, radio de cabecera y tarjetas de 24 px, separación de 18 px, lienzo `#f4f3f1`, héroe y pestaña activa `#5f2b2b`, número a 66.24 px/peso 540 en escritorio, y el mismo color y radio de chip.

## Lo que prueban los datos

- `web/e2e/09-filtros-teclado.spec.ts` verifica Tab, búsqueda sin acentos, selección por teclado, rango móvil, CSV y URL de «Sacar reporte».
- `web/e2e/tablero-carga-viva.spec.ts` requiere un motor y bases **aislados**. Con dos CSV ficticios, la misma pestaña pasó de 0 a 6 y a 12 personas, de 0 a 1 y a 2 municipios; mostró ambos enlaces del mapa y la calidad de cada archivo sin recarga de documento.
- `web/scripts/paridad-tablero.mjs` compara el HTML con preguntas públicas de Metabase y lee el CSV. Para el cruce completo compara con las vistas SQLite: las preguntas públicas no admiten todos los filtros. La edad publicada por Metabase es global; el Tablero muestra la edad de la selección.
