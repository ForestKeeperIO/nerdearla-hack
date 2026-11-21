# Benchmark de interfaz: 21st.dev, details.so y productos de referencia

Hecho con Devin el 2026-11-21 (solo lectura, búsqueda web). Las URL y los nombres de componentes vienen de esa sesión y no se verificaron uno por uno: comprueba cada enlace antes de instalar algo.

---

Voy a investigar ambos sitios en paralelo.Voy a intentar con las herramientas MCP de Tavily y curl.Intento con la herramienta de búsqueda integrada.La búsqueda web funciona. Continúo con búsquedas en paralelo para cubrir todos los componentes.Faltan barras horizontales/listas con barra y los patrones de details.so. Sigo con las últimas búsquedas.Últimas verificaciones: URLs de documentación de flujos de importación/dedup de productos reales.# Benchmark de UI — Plataforma de datos para ONG de salud

## 1. Componentes en 21st.dev

Todos los comandos siguen el patrón `npx shadcn@latest add "https://21st.dev/r/<autor>/<slug>?api_key=$API_KEY_21ST"` (requiere API key gratuita en https://21st.dev/mcp).

- **Carga de archivos + lista con estado** — *File Upload* (bundui): dropzone drag-and-drop que lista archivos con icono, tamaño y acciones de quitar/limpiar, con validación de cantidad y tamaño máximo. Ideal para Excel con badge de estado encima. https://21st.dev/@bundui/components/file-upload3 · Alternativa con validación de tipo y preview: *File Dropzone* (joyco) https://21st.dev/@joyco/components/file-dropzone
- **Stepper 4 pasos** — *Stepper* (kevingirelli, MIT): indicador accesible de pasos completo/actual/próximo con triggers clicables. Sobrio, sin animaciones innecesarias. https://21st.dev/@kevingirelli/components/stepper
- **Tarjetas KPI** — *Stat Card* (konsstepnov, MIT): valor, delta, medidor de meta, sparkline y —clave— estados loading/empty/error incluidos. https://21st.dev/@konsstepnov/components/stat-card · Alternativa más simple: *Stat* (redrob-labs) https://21st.dev/@redrob-labs/components/stat
- **Calificación en estrellas** — *Star Rating* (shadcncraft, Apache-2.0): modo solo-lectura con relleno parcial, perfecto para una calificación de calidad calculada (no editable). https://21st.dev/@shadcncraft/components/star-rating
- **Comparación lado a lado** — *Comparison* (muneebable): dos tarjetas con divisor "VS" y desglose fila por fila. Es la estructura exacta para resolver duplicados; habría que adaptar los checkmarks a datos del registro + dos botones. https://21st.dev/@muneebable/components/comparison
- **Tabla de datos** — *Data Table* (shadcn oficial, TanStack Table): ordenación, filtros, paginación, selección. El estándar para la pantalla de calidad/personas. https://21st.dev/@shadcn/components/data-table
- **Barras horizontales / lista con barra** — *Bar List* (sltowl, MIT): lista compacta de valores rankeados como barras horizontales — ideal para "desglose por ciudad" sin gráfica pesada. https://21st.dev/@sltowl/components/bar-list · Para gráfica real: *Bar Chart* (retroui, Recharts, horizontal/vertical) https://21st.dev/@retroui/components/bar-chart
- **Sidebar** — *Sidebar* (shadcn oficial): app shell colapsable con cookie de estado y atajo de teclado. https://21st.dev/@shadcn/components/sidebar
- **Estados vacíos** — *Empty* (cnippet, MIT): familia componible Empty/EmptyHeader/EmptyTitle/EmptyContent con CTA, sin dependencias. https://21st.dev/@cnippet-dev/components/cnippet-empty
- **Toast / banner** — *Toast* sobre Sonner (arunachalam) https://21st.dev/@arunachalam/components/toast (en la práctica: `npx shadcn@latest add sonner`) y *Alert Banner* (lavikatiyar) para avisos persistentes tipo "12 posibles duplicados pendientes". https://21st.dev/@lavikatiyar/components/alert-banner

## 2. details.so

Advertencia honesta: su taxonomía (verificada en https://www.details.so/inspo.md y https://www.details.so/llms.txt) es de sitios de marketing — hero, footer, preloaders — y **no tiene categorías de flujos de app** (no existe "upload", "duplicate", "dashboard" ni "empty state"). Lo aplicable:

- **Stats (62 ejemplos)**: https://www.details.so/inspo/category/stats — cómo sitios serios presentan cifras grandes con jerarquía.
- **Steps (31)**: https://www.details.so/inspo/category/steps — tratamiento visual de procesos por pasos.
- **List (119)**: https://www.details.so/inspo/category/list y **Rows (82)**: https://www.details.so/inspo/category/rows — ritmo, separadores y densidad de filas repetidas (aplica a listas de archivos y registros).
- **Modal (73)**: https://www.details.so/inspo/category/modal — para confirmaciones de fusión irreversible.
- Filtro de industria **Health (209)** y **SaaS (779)** dentro de https://www.details.so/inspo — la biblioteca completa requiere plan Pro.

## 3. Productos reales que imitar

- **Airtable CSV import**: antes de importar, muestra conteos "X se actualizarán / Y sin cambios / Z nuevos" y permite elegir campo único de fusión. https://support.airtable.com/articles/3067164948-csv-import-extension
- **Airtable Dedupe**: matching exacto/similar/fuzzy y fusión campo por campo. https://support.airtable.com/articles/2534579068-dedupe-extension
- **HubSpot Duplicates Manager**: detección automática diaria, pares revisables uno a uno o en masa, con opción de rechazar (no fusionar). https://knowledge.hubspot.com/records/manage-duplicate-records
- **Salesforce Merge**: columnas lado a lado por registro, radio por campo y elección de registro maestro — el patrón canónico de resolución de duplicados. https://help.salesforce.com/s/articleView?id=sf.contacts_merge_lex.htm&language=en_US
- **Linear Import**: re-imports saltan registros ya importados (idempotencia) y mapean al concepto más cercano con aviso de lo que no se importará. https://linear.app/docs/import-issues

## (a) Dirección visual

Inter o IBM Plex Sans; densidad media, filas de tabla cómodas (~44px) para usuarias no técnicas. Fondo neutro cálido (stone/zinc), tarjetas blancas con borde 1px, radio 8–10px, sombra casi nula. Rosa solo en acento: primario de botones, estrellas, barra activa del sidebar y highlights de gráficas. Texto de UI en español llano, verbos claros ("Subir archivo", "Son la misma persona"). Números tabulares en KPIs.

## (b) Los 8 componentes, por pantalla

1. file-upload3 (Subir) · 2. stepper kevingirelli (Subir→Calidad→Duplicados→Informe) · 3. sonner + alert-banner (Subir) · 4. data-table shadcn (Calidad) · 5. star-rating shadcncraft (Calidad) · 6. comparison muneebable adaptado (Duplicados) · 7. stat-card konsstepnov (Tablero) · 8. bar-list sltowl (Tablero) — y sidebar oficial como shell; informe imprimible con `print:` utilities de Tailwind.

## (c) 5 errores típicos a evitar

Rosa como fondo o gradiente en todo; deltas/sparklines falsos sin dato real detrás; animaciones decorativas que distraen de la decisión; ignorar estados vacío/error/carga y acentos en nombres; tipografía <13px y métricas apiladas sin jerarquía clara.

**No verificado**: previews en vivo de cada componente (solo metadatos), contenido tras el paywall de details.so y compatibilidad exacta de versiones con tu stack.
