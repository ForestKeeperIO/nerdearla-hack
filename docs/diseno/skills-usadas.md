# Dirección B: bento de impacto

Las capturas son ventanas de Chromium sobre el sitio funcionando, no maquetas. En `capturas/`, `antes-{pantalla}-{1440,390}.png` registra la aplicación anterior. Los tres 404 de Reportes en el «antes» son intencionados: esas rutas no existían. `indice` es la entrada del flujo de carga; `pares` es el detalle dentro de Calidad. Los archivos `despues-` registran el resultado. Datos ficticios.

## High-end-visual-design

Skill: `~/.agents/skills/high-end-visual-design/SKILL.md`. Se leyó completa y se volvió a invocar con el cambio de dirección de Ian. El primer pase conservaba el aspecto de un oficio; el segundo lo sustituyó por “The Asymmetrical Bento” y “Soft Structuralism”. Del patrón de acción: “The Button-in-Button Trailing Icon”. Miniaturas con las cifras y el mapa del corte, cifras en Geist, controles en píldora y disposición lateral que se apila en móvil. El rayado señala resultados pendientes, nunca un porcentaje supuesto.

Referencias abiertas: Donezo (`ref4-task-full.png`), Finance Management (`ref2-finance-full.png`), Shopeers (`ref3-shopeers-full.png`) y Axis (`ref6-axis-travel-full.png`). Las dos primeras guiaron las filas de tarjetas y semicírculos; las otras, la indicación de periodo y la cartografía dentro de la tarjeta. No se copiaron sus datos ni marcas.

Archivos: `web/app/bento.css`, `expediente.css`, `layout.tsx`, `reportes/`, `subir/`, `informe/[alcance]/`, `web/components/{marco,pasos,pares-masa,anillo-dato,atlas-reporte}.tsx`. La hoja impresa conserva membrete, tablas y metodología, sin las acciones de pantalla.

## Hallmark

Skill: `.agents/skills/hallmark/SKILL.md` del proyecto (no existe la copia indicada bajo `~/.agents/skills/`). Dirección específica de EIRA, sin el tema Coral. Reglas: “Never an invented metric, testimonial, logo wall or case-study count” y “Every interactive element has `:focus-visible`, appearing instantly”. El CSS usa los tokens de vino, el mapa usa geometrías del INEGI y no hay deltas ficticios.

Comando: `node .agents/skills/hallmark/scripts/sloplint.mjs <css> --scope app --render --url <ruta>`. Render con Puppeteer y Chromium. Resultado anterior: `0 FAIL, 23 REFLEX, 1 WARN`; salida íntegra en `hallmark-antes.txt`. Archivos revisados: cabecera, índices, hojas de reporte, tarjetas de carga y pares.

El primer render de las siete rutas después del rediseño señaló un problema reproducible: los títulos SVG de los puntos del mapa llegaban vacíos en el HTML inicial (error de hidratación). Se cambió cada título a una sola cadena. El mismo pase encontró contraste de foco bajo sobre vino y un pie de carga que sobresalía a 375 px; ahora el foco cambia según el fondo y las acciones pueden pasar a otra línea. La revisión anterior era de una ruta, no de siete: los totales de ambos archivos no son una comparación estadística.

Render de entrega en `780bd4e`: `17 FAIL, 8 REFLEX, 7 WARN` (`hallmark-despues.txt`, cuatro estilos y siete rutas). No es un lint verde. Los nombres completos de los tres botones, los hallazgos de Calidad y los títulos de informes pueden ocupar dos líneas en teléfonos estrechos: se conservan legibles en vez de cortarlos. En el historial se mantiene igual peso visual para ediciones comparables. Se conservan la medida breve de la fecha de corte, cuatro pesos de texto, radios uniformes, cabeceras de tarjeta e iconos de acordeón funcionales; no son imágenes faltantes. Tras el render se ajustaron el borde del selector, el foco en la cifra oscura y el salto de navegación a 375 px. Queda pendiente recalificar esos ajustes y el aviso de espacio en Vista previa con el detector completo.

## Impeccable

Skill: `~/.agents/skills/impeccable/SKILL.md`. `scripts/impeccable context --target web` confirmó un sistema existente, sin `PRODUCT.md`. Se usó el pase `polish` en lugar de inventar un nuevo brief. Regla aplicada: “Controls name their action; errors name the problem and the recovery.” Los tres botones de cada par nombran el destino del evento; la confirmación depende del estado publicado, no del clic. La impresión omite los controles; la tabla ancha sigue siendo navegable con teclado.

`scripts/impeccable detect --json web/app/bento.css web/components/pares-masa.tsx web/app/reportes` identificó `border-accent-on-rounded` en la hoja del oficio. Se quitó ese borde de la pantalla; el filete de la hoja impresa es independiente de las tarjetas.

Segunda ejecución del mismo detector sobre el historial: `[]`. Las capturas `despues-reportes-*` muestran el historial antes de las plantillas; `despues-guardado-{aliados,territorial}-*` son los destinos de **Abrir**. En la copia aislada, el PDF y el CSV de la edición de 92 personas conservaron sus hashes después de generar la edición de 98. En `despues-indice-*` se ve la zona de carga real de `/subir`; ya no es un catálogo que exija otro clic.

## Modern Web Guidance y redesign-existing-projects

Rutas: `.agents/skills/modern-web-guidance/SKILL.md`, `~/.agents/skills/redesign-existing-projects/SKILL.md`. `npx -y modern-web-guidance@latest search "responsive data table"` y `retrieve responsive-table`: “Add a `tabindex="0"` attribute to the container”. Aplicado a regiones de tablas de evidencia con nombre accesible. Del rediseño: “Scan”, “Diagnose”, “Fix”; se mantuvieron la carga, las URL antiguas (redirecciones) y la firma pública de `ParesMasa`, sin editar el Tablero.

## Verificación y entrega

Se consultaron `~/.agents/skills/work-unit-commits/SKILL.md` (“A commit represents a deliverable behavior”), `cognitive-doc-design/SKILL.md` (“Lead with the answer”), `orca-cli/SKILL.md` y `orchestration/SKILL.md`. El ejecutable de Orca no pudo iniciar; los partes se entregaron por el archivo alternativo solicitado.

### Repetir el recorrido sin tocar la demo en vivo

Usar un servidor combinado de `fe` y `fe-reportes` con **copias dedicadas** de Valkey y la base de reporte, y un trabajador que consuma solo esa cola. El ensayo parte del corte ficticio de septiembre de 2026, con Tamizaje y Melenas cargados y sin actividad en Tonalá ese mes. No activar la prueba contra la demo compartida. La prueba crea una fuente; no borra ni restaura datos.

El servidor recibe `VALKEY_URL` para las cargas y decisiones, `IMPACTO_DB` para leer las vistas consolidadas de reporte, y `PORT` con el mismo puerto de `next start`. Instalar Chromium de Playwright o indicar el ejecutable en `EIRA_CHROMIUM`. La descarga PDF usa ese navegador para imprimir la URL local de la misma selección; en el lector también existe la impresión del navegador de la usuaria. Sin base de reporte, el lector no sustituye un cruce filtrado por los totales globales.

Con el servidor ya iniciado: `E2E_DEMO_AISLADO=1 E2E_BASE=<origen-local-aislado> E2E_CHROMIUM=<ejecutable-local> npx playwright test e2e/demo-dos-reportes.spec.ts` desde `web/`. Requiere `pdftotext`. Verifica el incremento de personas y lugares en la pestaña abierta, el nuevo punto del mapa, la carga y sus estrellas y **el contenido descargado** de ambos PDF y CSV.
---
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
