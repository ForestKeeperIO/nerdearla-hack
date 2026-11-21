# Auditoría de details.so — referencias para el rediseño de la app de informes EIRA

Fecha: 2026-11-21 · Rama: `referencias` · Capturas en `docs/referencias/capturas-details/`

Aplicación a rediseñar: herramienta interna de EIRA (ONG de salud, México). Persona no técnica en laptop; flujo guiado de 4 pasos sin salto (Subir → Calidad → Vista previa → Exportar), lista de informes con estado vacío, resolución de duplicados lado a lado, cifras (personas, atenciones, edad promedio, desglose por ciudad).

Restricciones del dueño: gama alta, sobrio, preciso. Nada de rosa/magenta/fucsia. Sin degradados decorativos. Paleta neutra + UN solo acento.

---

## a. Mapa de details.so

details.so es una biblioteca curada a mano de ~3 569 "detalles" capturados de sitios reales en producción. Índices para agentes: `llms.txt` e `inspo.md`. Cada categoría lista inspiraciones; cada inspiración tiene un `.md` con sitio de origen, etiquetas y medios (imagen/video). El código fuente verificado solo está en su MCP de pago.

Taxonomía (conteos según `inspo.md`):

- **Elementos**: 3D (75), Accordion (54), Button (177), Card (76), Carousel (147), List (119), Modal (73), Rows (82).
- **Secciones**: 404 (79), About, Article, Blog, Case Study, Contact, Content (240), CTA, Drawer (61), Dropdown (81), FAQ, Features (463), Footer (366), Fullscreen, Hero (427), Legal, Logo, Morphing, Navigation (257), Newsletter, Portfolio, Pricing, Products, Services, Social Proof, **Stats (62)**, **Steps (31)**, Team, Testimonial, Timeline (23).
- **Interacciones**: Card Hover, Contextual Transition, Cursor, Horizontal Scroll, Media Showcase, Page Transition, Parallax, Pinned Scroll, Preloader, Scroll Animations (515), Section Transition, Stacked Scroll, Text Showcase.
- **Industrias**: AI, Architecture, ..., **Finance (212)**, **Health (209)**, Industrial, **SaaS (779)**, ...
- **Estilos**: Brutalist, Corporate, Editorial (1 752), Experimental, Image-led, Luxury, **Minimal (1 229)**, ...

### Categorías útiles para esta app (y las que no existen)

| Necesidad de la app | Categoría details.so | Comentario |
|---|---|---|
| Indicador de pasos del flujo | `steps` (31) | Referencias de secciones "cómo funciona"; el patrón numerado se adapta a stepper de cabecera. No hay categoría "wizard/stepper" como tal. |
| Tarjetas de cifras | `stats` (62) | La más directa para Vista previa. |
| Fila de archivo / tabla de problemas | `rows` (82), `list` (119) | No existe categoría "table"; `rows` la cubre. |
| Par de tarjetas para comparar duplicados | `card` (76) | — |
| Botón primario | `button` (177) | — |
| Aviso / confirmación | `modal` (73) | — |
| Problemas por fila desplegables | `accordion` (54) | — |
| Cabecera | `navigation` (257), `dropdown` (81) | — |
| Estado vacío | **no existe** | Carencia real: no hay categoría de empty states ni de formularios ni de carga de archivos. |
| Zona de carga (dropzone) | **no existe** | Se compone de `card` + `button`. |
| Tablas/formularios | **no existe** | `rows` como sustituto. |

Hallazgo del mapa: details.so está orientado a sitios de marketing, no a aplicaciones. Las piezas transferibles son las unidades visuales (stat, row, card, modal, steps); los patrones propiamente de "app" (dropzone, empty state, wizard) hay que componerlos.

## b. Referencias elegidas (18)

Leyenda de verificación: **[medido]** = HTML/CSS del sitio de origen inspeccionado en esta auditoría (Chrome headless o CSS servido). **[bloqueado]** = el origen respondió "Vercel Security Checkpoint" (25 KB) a Chrome headless y a curl; el análisis se basa en la captura y metadatos de details.so, y se dice qué NO se pudo medir. **[sin verificar]** = no alcanzó el tiempo para abrir el origen.

---

### Cifras y tarjetas de dato

**1. OhMD — Stats + Card** · [medido]
- details.so: https://www.details.so/inspo/ohmd-caa5e6 · Categoría: Stats, Card · Industria: Health, SaaS
- Origen: https://www.ohmd.com/product/patient-communication
- Captura: `capturas-details/ohmd-caa5e6.jpg`
- Medido en ohmd.com (Framer): tinta `#061B12` (101 usos, verde-tinta casi negro), fondo roto `#F7F5F2`, borde `#E6E4E2`, gris `#7A7A7A`. Fuentes: Geist e Inter (sans) + Fragment Mono; pesos 300 (dominante en titulares), 400, 500. Cuerpo 14–16 px, interlineado 1.2–1.4 em. Radios: tarjetas 16–32 px, píldoras 100 px/1000 px.
- Patrón: bloque de stat con número grande en peso ligero sobre tinta profunda + etiqueta en mono/versalitas. La jerarquía la da el contraste tinta/papel y el peso 300, no el tamaño excesivo. Transferible 1:1 a "personas / atenciones / edad promedio".

**2. OhMD — Rows** · [medido] (mismo origen)
- details.so: https://www.details.so/inspo/ohmd-9b7a85 · Categoría: Rows
- Origen: https://www.ohmd.com/
- Captura: `capturas-details/ohmd-9b7a85.webp`
- Filas con separador fino `#E6E4E2`, texto 14 px en dos pesos, metadato a la derecha. Sirve para la fila de archivo con estado y la tabla de problemas por fila.

**3. Antimetal — Stats** · [bloqueado]
- details.so: https://www.details.so/inspo/antimetal-aca29b · Categoría: Stats · Estilo: Minimal, Luxury
- Origen: https://antimetal.com/ (Vercel checkpoint; no medido)
- Captura: `capturas-details/antimetal-aca29b.webp`
- De la captura: stat sobrio sobre fondo claro, número tabular, etiqueta corta debajo; sin iconos ni decoración. Referencia de contención para la Vista previa.

**4. Biograph — Stats + Card Hover** · [sin verificar]
- details.so: https://www.details.so/inspo/biograph-5b1e9d · Categoría: Stats · Industria: Health · Estilo: Luxury
- Origen: https://www.biograph.com/
- Captura: `capturas-details/biograph-5b1e9d.webp`
- Referencia de "salud de gama alta": stat con mucho aire y hover sutil en tarjeta. Usar el aire, no el hover.

**5. Abatable — Stats** · [medido]
- details.so: https://www.details.so/inspo/abatable-514592 · Categoría: Stats, Carousel · Industria: SaaS, Finance
- Origen: https://abatable.com/
- Captura: `capturas-details/abatable-514592.webp`
- Medido en su CSS (Webflow): familia PPMori (comercial, no usable; sustituto abajo), azul tinta `#002642`, casi negro `#0A0A0A`, fondos `#FAFAFA`/`#F5F5F5`, gris `#758696`. Cuerpo 14/18 px (`.875rem`), interlineado 1.5, radios por tokens (`--radius--small`, `--radius--main`, `--radius--round`).
- Patrón: cifra + etiqueta en columna, jerarquía por peso y por el único acento de color. Confirma el azul tinta como opción de acento.

### Pasos (indicador del flujo)

**6. Decimals — Steps** · [bloqueado]
- details.so: https://www.details.so/inspo/decimals-d10992 · Categoría: Steps, Features
- Origen: https://www.decimals.co/how-it-works (Vercel checkpoint; no medido)
- Captura: `capturas-details/decimals-d10992.webp`
- De la captura: pasos numerados con número pequeño en mono + título + línea conectora. Modelo para el indicador "1 Subir · 2 Calidad · 3 Vista previa · 4 Exportar".

**7. Try Architect — Steps + Card** · [sin verificar]
- details.so: https://www.details.so/inspo/tryarchitect-664a81 · Industria: SaaS
- Origen: https://tryarchitect.com/
- Captura: `capturas-details/tryarchitect-664a81.jpg`
- Paso dentro de tarjeta con numeración; alternativa al stepper horizontal si se quiere el paso actual en tarjeta.

**8. Go Daylight — Steps** · [bloqueado]
- details.so: https://www.details.so/inspo/godaylight-1bf62d · Estilo: Editorial
- Origen: https://godaylight.com/ (Vercel checkpoint; no medido)
- Captura: `capturas-details/godaylight-1bf62d.webp`
- Numeración editorial grande; útil para el tono "preciso, de informe" del stepper.

**9. Understory — Steps** · [sin verificar]
- details.so: https://www.details.so/inspo/understory-b9f3e8 · Industria: SaaS
- Origen: https://understory.io/
- Captura: `capturas-details/understory-b9f3e8.webp`
- Variante de pasos con progreso apilado; respaldo si el horizontal no convence.

### Filas, listas y tablas

**10. Revelatio — Rows** · [medido]
- details.so: https://www.details.so/inspo/revelatio-1e8867 · Categoría: Rows · Estilo: Minimal, Editorial
- Origen: https://revelatio.studio/approach
- Captura: `capturas-details/revelatio-1e8867.webp`
- Medido en su CSS (Webflow): escala en `em` (.75, .875, 1.125, 1.5, 1.75, 2.25, 3), casi todo `#000`/`#FFF` con bordes `#E2E2E2`, radios pequeños .125–.33 em, interlineado 1.1–1.3.
- Patrón: fila editorial estricta — índice a la izquierda, título, dato a la derecha, separador hairline. Referencia principal para la lista de informes y la tabla de problemas.

**11. Grail — Rows** · [bloqueado]
- details.so: https://www.details.so/inspo/grail-app-7b504d · Categoría: Rows · Industria: SaaS
- Origen: https://grail-app.com/ (Vercel checkpoint; no medido)
- Captura: `capturas-details/grail-app-7b504d.webp`
- De la captura: filas de producto con miniatura y dato tabular. Alternativa para la fila de archivo con icono de Excel + estado.

**12. COMINVI — List** · [medido, parcial]
- details.so: https://www.details.so/inspo/cominvi-bc8cd6 · Categoría: List · Industria: Industrial (empresa mexicana)
- Origen: https://www.cominvi.com.mx/about-us
- Captura: `capturas-details/cominvi-bc8cd6.webp`
- Medido (DOM, estilos inline): tinta `#151515`, fondo `#EBF0ED` (verde grisáceo pálido), pesos 500; escala 0.75–4 em.
- Lista con marcador y barra; referencia para "desglose por ciudad" con barra de proporción.

### Tarjetas para comparar (duplicados)

**13. Hebbia — Card** · [bloqueado]
- details.so: https://www.details.so/inspo/hebbia-5a8069 · Industria: AI, Finance, SaaS
- Origen: https://www.hebbia.com/ (Vercel checkpoint; no medido)
- Captura: `capturas-details/hebbia-5a8069.webp`
- De la captura: tarjeta de datos sobria con borde fino y etiqueta superior. Modelo para las dos tarjetas "registro A / registro B".

**14. Trynova — Card** · [medido]
- details.so: https://www.details.so/inspo/trynova-e0ef87 · Industria: SaaS
- Origen: https://trynova.io/
- Captura: `capturas-details/trynova-e0ef87.webp`
- Medido (Tailwind, Inter): cuerpo 12–14 px, peso 500 dominante, interlineados absolutos 15–22 px, radios 4/8 px + `9999px` para chips. Neutros `#787774`, `#E8EAED`.
- Patrón: tarjeta densa de datos; par de ellas para comparar duplicados lado a lado.

### Botones

**15. Viru Group — Button** · [medido]
- details.so: https://www.details.so/inspo/virugroup-a04a87 · Industria: Food, Health
- Origen: https://www.virugroup.com/en/
- Captura: `capturas-details/virugroup-a04a87.webp`
- Medido: verde bosque `#194122` (11 usos), tinte pálido `#E0E9DD`, papel `#F4F4F4`, gris `#595959`; radios 0–64 px (píldora 32/64), pesos 700 en botón/titular.
- Evidencia clave del acento recomendado: una organización de salud/alimentación usa verde bosque como único acento sobre neutros cálidos.

**16. Eduard Bodak — Button** · [sin verificar]
- details.so: https://www.details.so/inspo/eduardbodak-59f66b · Estilo: Minimal, Experimental
- Origen: https://www.eduardbodak.com/work/filmbot
- Captura: `capturas-details/eduardbodak-59f66b.webp`
- Botón minimal de estudio; referencia de botón secundario discreto.

### Avisos y modales

**17. COMINVI — Modal** · [medido, parcial]
- details.so: https://www.details.so/inspo/cominvi-bcbaa1 · Categoría: Modal, Products
- Origen: https://www.cominvi.com.mx/technology
- Captura: `capturas-details/cominvi-bcbaa1.webp`
- Modal sobrio (misma paleta `#151515`/`#EBF0ED`); modelo para el aviso de decisiones y confirmaciones.

**18. Mecha — Modal** · [medido, parcial]
- details.so: https://www.details.so/inspo/mecha-xyz-fce7d2 · Industria: Finance
- Origen: https://mecha-xyz.webflow.io/
- Captura: `capturas-details/mecha-xyz-fce7d2.webp`
- Medido: tinta `#262933`, tintes `#EBF0F0`/`#E9E7DB`; modal financiero contenido.

### Acordeón (problemas por fila)

**19. Produx — Accordion** · [bloqueado]
- details.so: https://www.details.so/inspo/produx-398bfd · Estilo: Minimal
- Origen: https://www.produx.design/ (Vercel checkpoint; no medido)
- Captura: `capturas-details/produx-398bfd.webp`
- Acordeón minimal: fila con título + chevron; para "N problemas" por archivo, expandible por fila.

## c. Pantalla → componente → referencia

| Pantalla / zona | Componente | Referencia principal | Alternativa |
|---|---|---|---|
| Cabecera del informe | Indicador de 4 pasos (bloqueante) | **Decimals** (steps numerados + conector) | Go Daylight (numeración editorial), Try Architect (paso en tarjeta) |
| Cabecera | Navegación superior | **Abatable nav/dropdown** (`abatable-db6003`) | — |
| Lista de informes | Filas de informes | **Revelatio rows** (hairline, índice, dato derecha) | Grail rows, OhMD rows |
| Lista de informes | Estado vacío | Composición propia: tipografía Revelatio + tarjeta OhMD + botón Viru *(no hay ref. de empty state; ver §e)* | — |
| Subir | Zona de carga (dropzone) | Composición: marco punteado con radio 16 (OhMD) + botón Viru *(no hay ref. de dropzone)* | — |
| Subir | Fila de archivo con estado (ok/dup/error) | **OhMD rows** | Grail rows |
| Calidad | Calificación de archivo (1–5) | **Antimetal stat** (cifra sobria) + estrellas en tinta | Biograph |
| Calidad | Problemas por fila (desplegable) | **Produx accordion** sobre filas **Revelatio** | — |
| Calidad | Par de tarjetas para decidir duplicados | **Hebbia card** ×2 con dos botones | Trynova card ×2 |
| Vista previa | Tarjetas de cifra (personas, atenciones, edad) | **OhMD stats** | Antimetal, Abatable |
| Vista previa | Desglose por ciudad con barra | **COMINVI list** | Grail rows |
| Exportar | Botón primario | **Viru Group** (verde bosque, píldora) | Eduard Bodak (secundario) |
| Exportar / avisos | Aviso y confirmación | **COMINVI modal** | Mecha modal |

## d. Sistema visual propuesto (tokens CSS)

**Acento recomendado: verde bosque** — `--accent: #1C4633`. Justificación con referencias: dos origenes del dominio salud usan verde-tinta como identidad (OhMD `#061B12` como tinta, Viru `#194122` como color de marca); comunica salud/seriedad sin ser el azul SaaS de siempre. Alternativa: **azul tinta** `#002642` (Abatable), correcta pero más genérica.

**Tipografía (Google Fonts, licencia abierta)**: Space Grotesk 500/600 para titulares y cifras (se acerca al carácter técnico-editorial de PPMori/Geist), Inter 400/500 para UI y cuerpo, IBM Plex Mono 400 para IDs, cifras tabulares y etiquetas (eco de Fragment Mono en OhMD).

```css
:root {
  /* Neutros cálidos */
  --ink:        #17140F; /* tinta casi negra cálida */
  --ink-soft:   #4A463E;
  --gray:       #7A756B; /* cf. OhMD #7A7A7A */
  --line:       #E3E0D8; /* hairline, cf. OhMD #E6E4E2 */
  --paper:      #F7F5F1; /* blanco roto, cf. OhMD #F7F5F2 */
  --paper-2:    #EFECE5;
  --white:      #FFFFFF;

  /* Acento único (elegir UNO) */
  --accent:     #1C4633; /* verde bosque — RECOMENDADO (Viru #194122 / OhMD #061B12) */
  /* --accent:  #002642;    azul tinta — alternativa (Abatable) */
  --accent-ink: #FFFFFF; /* texto sobre acento */
  --accent-dim: #E0E9DD; /* tinte pálido del acento (Viru #E0E9DD): estados ok, barras */

  /* Semánticos sin rosa; error en ladrillo apagado, no magenta */
  --warn:       #8A6D1F;
  --error:      #8C3B2E;

  /* Tipografía */
  --font-display: "Space Grotesk", sans-serif; /* 500/600 */
  --font-ui:      "Inter", sans-serif;         /* 400/500 */
  --font-mono:    "IBM Plex Mono", monospace;  /* 400 — IDs y cifras */

  /* Escala (px) — compacta de app, medida en OhMD/Trynova */
  --fs-hero: 32px; --fs-h2: 22px; --fs-stat: 28px;
  --fs-body: 14px; --fs-small: 13px; --fs-meta: 12px;
  --lh-body: 1.45; --lh-tight: 1.2;

  /* Espaciado (4px base) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-6: 24px; --sp-8: 32px; --sp-12: 48px;

  /* Radios (measured: tarjetas 16px OhMD, chips pill, controles 6-8 Trynova) */
  --r-sm: 6px; --r-md: 10px; --r-lg: 16px; --r-pill: 999px;

  /* Bordes y sombras — sobrio: hairline primero, sombra casi nula */
  --border: 1px solid var(--line);
  --shadow-card: 0 1px 2px rgba(23,20,15,.06);
  --shadow-modal: 0 8px 32px rgba(23,20,15,.14);
}
```

Reglas derivadas de las referencias: jerarquía por peso (titulares 300–500, no negritas pesadas), cifras en mono tabular, separadores hairline `#E3E0D8` en vez de tarjetas anidadas, un solo acento reservado a acciones primarias y estado "correcto".

## e. Qué NO se pudo ver

- **Orígenes tras Vercel Security Checkpoint** (Chrome headless y curl reciben 25 KB de "checkpoint", sin CSS medible): antimetal.com, decimals.co, hebbia.com, godaylight.com, grail-app.com, produx.design. Para esas seis referencias el análisis se basa en la captura de details.so + sus metadatos; **no hay medidas verificadas de tipografía/color/espaciado del origen**.
- **Sin verificar por tiempo**: biograph.com, tryarchitect.com, understory.io, eduardbodak.com.
- **details.so no publica** el código fuente de las piezas en las páginas públicas; los "verified source excerpts" requieren su MCP de pago. Las medidas vienen del sitio de origen, no de details.so.
- **Categorías inexistentes** en details.so: dropzone/upload, empty state, tabla densa, formularios, stepper funcional. Esos componentes se proponen por composición y no tienen referencia directa.
- **Videos**: cada `.md` enlaza un MP4 del detalle en movimiento; no se descargaron (se analizaron los fotogramas).

## Licencias

Las referencias son sitios de terceros protegidos por derechos de autor. De este trabajo se reproducen **patrones** (jerarquía, proporciones, tokens) con código propio: no se copia su código, sus imágenes ni sus tipografías comerciales (p. ej. PPMori de Abatable). Las fuentes propuestas (Space Grotesk, Inter, IBM Plex Mono) son de Google Fonts con licencia abierta (OFL/Apache). Las capturas de `capturas-details/` son de details.so/orígenes, solo para referencia interna del diseño, no para redistribución.
