# UI brief: Impacto EIRA

Written 2026-11-21 20:52 CET (13:52 CDMX) from the notes on the VPS. It stands alone: everything a frontend agent needs is in this file, with the source file named for each claim. Nothing here is new design; it is what Ian asked for and what the benchmark documents say, put in one place and ordered by which rule wins.

Ian's messages are quoted verbatim, typos included, with the CDMX time. They come from the session transcript of 2026-11-21, not from a doc in the repo.

## 1. Which rule wins

The notes contradict each other because Ian changed direction three times. Apply them in this order; a later row never overrides an earlier one.

| # | Rule | Source | Status |
|---|---|---|---|
| 1 | Ian's direct messages (section 2) | Session transcript | Final |
| 2 | Product spec: guided flow, three reports, screen contents | `docs/superpowers/specs/2026-11-21-impacto-eira-diseno.md` | Current |
| 3 | EIRA palette and fonts | `docs/referencias/paleta-eira.md` | Current. Replaces every earlier colour rule |
| 4 | details.so audit: structure, spacing, hierarchy, 19 references | `docs/referencias/auditoria-componentes.md` (+ `capturas-details/`) | Current for layout. Its forest-green accent and its Space Grotesk/Inter fonts are **replaced** by row 3 |
| 5 | 21st.dev benchmark: component list, product patterns | `docs/contexto/benchmark-ui.md` | Current for which components. Its pink accent, its Inter/IBM Plex Sans fonts and its **sidebar shell** are **replaced** by rows 1 to 3 |
| 6 | Hallmark "Coral" theme, pink `#be185d`, sidebar + role selector | `NOTAS.md`, section "rama fe" | **Rejected by Ian.** Do not reuse |

## 2. What Ian said

| CDMX | Ian's words | What it settles |
|---|---|---|
| 12:03 | "tu eres encargado de crear y poner valkey (deja los fields limpios solo la base), el frontend, dahboards, busca haz un benchmark usemos hallmark para el FE, details.so y 21st.dev para buscar ejemplos de UI, y usemos npx modern-web-guidance@latest install asegurate de que devin ejecute todo esto profavor" | The benchmark sources are details.so and 21st.dev. Tools: Hallmark and Modern Web Guidance, run by Devin |
| 12:22 | "Te pedí referencias del benchmark no te he aprobado nada visual wtf" | References first. No visual direction is approved until Ian sees it |
| 12:27 | "El benchmark visual lo AVS a recrear 1:1 revisando el código fuente an ambas plataformas es posible" | Recreate the benchmark references 1:1, reading their source |
| 12:27 | "el plan visual es para que se vea y sienta high end" | Target: high end |
| 12:41 | "usaremos metabase, porfavor usa las referencias toma screenshots y revisa los links" | Dashboards are Metabase. Verify each reference link and capture it |
| 12:46 | "si no puedees utiliza entonces details.so" | If 21st.dev cannot be read, use details.so |
| 12:51 | "es un agregador, tienes que navegarlo , audit qur componentes quedan y usarlos, que es lo dificil no entiendo" | details.so is an aggregator: browse it, audit which components fit, use them |
| 12:51 | "la pagna que hciiste esta toda mal hecha" … "las referencias visuales high end" … "tenias una regla explicita de no rosa y solo cambiaste la tonalidad no chingues" | The first frontend was rejected. A pink page with a different pink is still a pink page |
| 12:51 | "entiende el uso, tienes una barra de herramientas para un flujo, o sea me puedo saltar pasos o que porfavor tomate un momento de entender el caso de uso y para quien es" | No free navigation over a flow. Steps cannot be skipped |
| 12:51 | "una version en blanco (sin seed) y otra lista para hacer un proyecto con fuentes e info real de fuentes reales" | Two online versions: blank and with real sources |
| 12:59 | "debe de estar separa el reporte por programa asi como cuando subes , incluir Global para poder hacer reporte de todos los programas, para el demo y PoC vamos a usar solo dos prorgamas ok? + el global" | One report per programme plus Global |
| 13:06 | "Melenas en Movimiento y Tamizaje Rosa , si hay data de salud agregalo, el chite es que la base de datos ayude a tener dif programas" / "no, cuenta como dos para el global" | The two demo programmes. A person in two programmes counts twice in Global |
| 13:08 | "recuerda usar su paleta de colores, eriraac.org para todo lod e front end pero mejoralo" | Colour: EIRA's own palette (eiraac.org), improved. This replaces "no pink" |
| 13:09 | "Recuerda tener, estado, municipio para la trazabiliad complta por estado (los que hay vs los que tenemos, tenerlo visual (sin que nos haga ver que noe stamos atendiendo full, no es algo primario )" | Territorial presence block: visual, secondary, never framed as a gap |

Two readings to keep straight:

- "No rosa" (12:51) and "usa su paleta" (13:08) are both in force. EIRA's palette contains pinks; the resolution in `paleta-eira.md` is that the deep tones lead and pink is a small tint. A screen that reads as pink fails Ian's 12:51 message even if every hex value is from the palette.
- "Barra de herramientas" at 12:51 was the sidebar of the rejected build. The spec turned that into "No hay barra lateral ni segunda navegación". The 21st.dev benchmark still lists the shadcn Sidebar as the app shell: that line is out of date.

## 3. The references

### 3.1 21st.dev components the benchmark names

From `docs/contexto/benchmark-ui.md`. Install pattern: `npx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$API_KEY_21ST"` (free key at https://21st.dev/mcp).

| Component | Author | URL | Licence on the page | What is in the repo today (`web/TERCEROS.md`) |
|---|---|---|---|---|
| File Upload | bundui | https://21st.dev/@bundui/components/file-upload3 | no-license | Own code over react-dropzone (`components/subir.tsx`) |
| File Dropzone (alternative) | joyco | https://21st.dev/@joyco/components/file-dropzone | not recorded | Not used |
| Stepper | kevingirelli | https://21st.dev/@kevingirelli/components/stepper | MIT | Own code (`components/pasos.tsx`) |
| Stat Card | konsstepnov | https://21st.dev/@konsstepnov/components/stat-card | page gave 404 | Own code |
| Stat (alternative) | redrob-labs | https://21st.dev/@redrob-labs/components/stat | not recorded | Not used |
| Star Rating | shadcncraft | https://21st.dev/@shadcncraft/components/star-rating | Apache-2.0 | Own code (`components/ui/star-rating.tsx`) |
| Comparison | muneebable | https://21st.dev/@muneebable/components/comparison | unknown | Own code (`components/misma-persona.tsx`) |
| Data Table | shadcn | https://21st.dev/@shadcn/components/data-table | MIT | Official shadcn pattern over TanStack Table 8 |
| Bar List | sltowl | https://21st.dev/@sltowl/components/bar-list | page gave 404 | Own code (`components/ui/bar-list.tsx`) |
| Bar Chart (alternative) | retroui | https://21st.dev/@retroui/components/bar-chart | not recorded | Not used |
| Sidebar | shadcn | https://21st.dev/@shadcn/components/sidebar | MIT | **Do not use as the app shell** (section 2) |
| Empty | cnippet | https://21st.dev/@cnippet-dev/components/cnippet-empty | MIT | Official shadcn `empty` |
| Toast | arunachalam | https://21st.dev/@arunachalam/components/toast | not recorded | `sonner` + shadcn wrapper |
| Alert Banner | lavikatiyar | https://21st.dev/@lavikatiyar/components/alert-banner | unknown | Own code |

Limits recorded in `docs/referencias/README.md` and `web/TERCEROS.md`: 21st.dev answers 403 to automated browsers, so none of these pages was captured and no source was read. Two pages gave 404. The project is MIT, so only MIT, BSD, ISC or Apache-2.0 code may be copied; "no-license" and "unknown" components were rewritten. Ian's "1:1 revisando el código fuente" is therefore **not met** for 21st.dev: it needs a 21st.dev API key or a person opening the pages by hand.

### 3.2 details.so references

From `docs/referencias/auditoria-componentes.md`. Captures are in `docs/referencias/capturas-details/<slug>.webp`. details.so is a library of marketing-site details; it has no category for dropzone, empty state, dense table, form or working stepper, so those are composed from the pieces below.

| # | Reference | details.so page | What to copy | Measured? |
|---|---|---|---|---|
| 1 | OhMD stats | https://www.details.so/inspo/ohmd-caa5e6 | Large figure in a light weight on deep ink, small label in mono. Hierarchy from contrast and weight, not from size. Cards radius 16 | Yes |
| 2 | OhMD rows | https://www.details.so/inspo/ohmd-9b7a85 | Hairline separator, 14 px text in two weights, metadata on the right | Yes |
| 3 | Antimetal stats | https://www.details.so/inspo/antimetal-aca29b | Sober figure, tabular numerals, short label below, no icon | Capture only |
| 4 | Biograph stats | https://www.details.so/inspo/biograph-5b1e9d | The white space around a figure. Not the hover | No |
| 5 | Abatable stats | https://www.details.so/inspo/abatable-514592 | Figure and label in a column, one accent colour. Body 14/18 px, line height 1.5 | Yes |
| 6 | Decimals steps | https://www.details.so/inspo/decimals-d10992 | Numbered steps: small mono number, title, connecting line | Capture only |
| 7 | Try Architect steps | https://www.details.so/inspo/tryarchitect-664a81 | The current step inside a card | No |
| 8 | Go Daylight steps | https://www.details.so/inspo/godaylight-1bf62d | Large editorial numbering | Capture only |
| 9 | Understory steps | https://www.details.so/inspo/understory-b9f3e8 | Stacked progress, as a fallback to the horizontal stepper | No |
| 10 | Revelatio rows | https://www.details.so/inspo/revelatio-1e8867 | Strict editorial row: index left, title, datum right, hairline. Radii 2 to 5 px | Yes |
| 11 | Grail rows | https://www.details.so/inspo/grail-app-7b504d | Row with thumbnail and tabular datum | Capture only |
| 12 | COMINVI list | https://www.details.so/inspo/cominvi-bc8cd6 | List with marker and proportion bar | Partly |
| 13 | Hebbia card | https://www.details.so/inspo/hebbia-5a8069 | Data card with thin border and a label on top | Capture only |
| 14 | Trynova card | https://www.details.so/inspo/trynova-e0ef87 | Dense data card, 12 to 14 px, weight 500, radii 4/8 px, pill chips | Yes |
| 15 | Viru Group button | https://www.details.so/inspo/virugroup-a04a87 | Pill primary button in one deep brand colour over warm neutrals | Yes |
| 16 | Eduard Bodak button | https://www.details.so/inspo/eduardbodak-59f66b | Quiet secondary button | No |
| 17 | COMINVI modal | https://www.details.so/inspo/cominvi-bcbaa1 | Sober modal for notices and confirmations | Partly |
| 18 | Mecha modal | https://www.details.so/inspo/mecha-xyz-fce7d2 | Contained modal | Partly |
| 19 | Produx accordion | https://www.details.so/inspo/produx-398bfd | Row with title and chevron | Capture only |

Also `abatable-db6003` (top navigation and dropdown) for the header.

"Capture only" means the origin site answered with a Vercel security checkpoint, so no typography, colour or spacing was measured. "No" means nobody opened the origin. Copy patterns with own code: no code, images or paid fonts from these sites.

### 3.3 Product references (flows, not looks)

From `docs/contexto/benchmark-ui.md`. Captures in `docs/referencias/`.

| Product | Capture | What to copy |
|---|---|---|
| Airtable CSV import | `airtable-importacion.png` | Before importing, counts of "will update / unchanged / new" |
| Airtable Dedupe | `airtable-dedupe.png` | Exact, similar and fuzzy matching; merge field by field |
| HubSpot duplicates manager | `hubspot-duplicados.png` | Pairs reviewed one at a time, with a "not the same" choice |
| Salesforce merge | `salesforce-fusion.png` | Two records side by side, row per field |
| Linear import | `linear-importacion.png` | A re-import skips what is already in and says what will not be imported |

### 3.4 Dashboard reference

Ian named one dashboard tool and no dashboard look: "usaremos metabase" (12:41). The notes hold no dashboard benchmark beyond that. The metabase.com pages listed in `docs/referencias/README.md` all answered 403 and were not captured. What exists:

- Metabase OSS 0.65.6 on port 3200 of the VPS, two public dashboards per environment ("Impacto" and "Calidad"), links in `metabase/enlaces.json`. "Impacto" takes `?programa=tamizaje-rosa` or `?programa=melenas-en-movimiento`.
- Captures of the current dashboards: `docs/capturas/metabase-impacto.png`, `metabase-impacto-tamizaje.png`, `metabase-impacto-melenas.png`, `metabase-calidad.png`.
- Rules already applied (`NOTAS.md`, Metabase section): series in vino, ciruela and pizarra; cards at the full 24 columns; "Presencia por municipio" table last, with no coverage percentage; no environment suffix in titles; iframe embedding allowed.

## 4. Colour and type

From `docs/referencias/paleta-eira.md` (Ian, 13:08).

| Role | Token | Value |
|---|---|---|
| Page background | `--papel` | `#fdfaf9` |
| Cards | `--superficie` | `#ffffff` |
| Text | `--tinta` | `#2e2e2e` |
| Secondary text | `--tinta-suave` | `#6b5c5c` |
| Lines and borders | `--linea` | `#eadfdd` |
| Primary action, current step, stars | `--vino` | `#7d3b3b` |
| Primary action, hover | `--vino-oscuro` | `#5f2b2b` |
| Second emphasis, second chart series | `--ciruela` | `#6a2b51` |
| Selected row, soft notice band | `--rubor` | `#ffebee` |
| Bar and progress fill | `--rosa` | `#ffa9b8` |
| Third chart series | `--pizarra` | `#7e8ba3` |
| Warning | `--aviso` | `#b0595a` |
| Error | `--error` | `#843f3f` |

- Pink is never a page or full-card background and never a text colour. `--rubor` only on small surfaces; `--rosa` only as bar fill.
- Do not use `#ff94a7`, `#b7426c` or the corals in large areas or text.
- One action colour per screen: `--vino`.
- The palette has no green. States use a word and an icon as well as colour.
- Fonts: Rosarivo for titles and large figures, Montserrat for the interface, a monospace (IBM Plex Mono) for identifiers.
- From the spec: text 16 px or larger; everything works by keyboard; no decorative data (no percentage deltas or sparklines without a real number behind them); a card takes only the space its content needs.
- From the audit, still valid: hierarchy by weight, hairline separators instead of nested cards, near-zero shadow, radii 6 / 10 / 16 px and pill, 4 px spacing base.

## 5. Screen by screen

Routes are the ones in `web/app/` on `main`. `<alcance>` is `tamizaje-rosa`, `melenas-en-movimiento` or `global`. All visible text is in Spanish. No technical words on screen: not "Valkey", not "cola", not "huella".

### 5.1 Inicio: `/`

- **Must show:** the three reports (two programmes and Global) as three entries, each with its progress ("Sin empezar", "Paso 2 de 4: Calidad", "Listo para exportar") and one action ("Empezar", "Continuar" or "Ver informe"). Global is locked until both programmes have a file, and says why ("Falta subir archivos de Melenas en Movimiento"). Nothing else.
- **Reference:** Revelatio rows (#10) for the list; Grail (#11) or OhMD rows (#2) as alternatives. Empty state composed from Revelatio type + OhMD card + Viru button, because details.so has none.
- **Copy from it:** index on the left, title, progress on the right, hairline between rows.
- **21st.dev:** Empty (cnippet). Not the Sidebar.
- **Current capture:** `docs/capturas/portada-vacia.png`, `portada-con-avance.png`, `global-bloqueado.png`.

### 5.2 Step indicator: on every `/informe/<alcance>/…` screen

- **Must show:** the four steps (three in Global: Calidad, Vista previa, Exportar), where the person is and what is left. A locked step looks locked and says why ("Primero sube al menos un archivo"). It is not a menu. A direct URL to a locked step lands on the step that is due. No sidebar, no second navigation. At the foot of each screen: one primary button ("Continuar a Calidad") and one secondary ("Volver").
- **Reference:** Decimals steps (#6). Alternatives: Go Daylight (#8), Try Architect (#7), Understory (#9). Header: Abatable navigation.
- **Copy from it:** small number, title, connecting line.
- **21st.dev:** Stepper (kevingirelli). Its clickable triggers must respect the lock.
- **Ian:** "o sea me puedo saltar pasos o que".
- **Current capture:** `docs/capturas/paso-bloqueado.png`.

### 5.3 Subir: `/informe/<alcance>/subir`

- **Must show:** a zone to drag `.xlsx` or `.csv`. Each file is a row with its state in words: "Leyendo…", "Listo: 120 filas", "Ya se cargó como 'tamizaje-rosa.xlsx'", "Versión nueva: se agregan 8 filas", "No se pudo leer: …". Inside a programme report only the record type is chosen, pre-selected when the file name suggests it, plus the state the cities belong to (Jalisco by default).
- **Reference:** dropzone composed from a dashed frame with radius 16 (OhMD) and the Viru button; file row from OhMD rows (#2) or Grail (#11). Flow from Airtable CSV import and Linear import.
- **Copy from it:** the before-import counts (Airtable) and "already imported, skipped" wording (Linear).
- **21st.dev:** File Upload (bundui) or File Dropzone (joyco); Toast (sonner) and Alert Banner (lavikatiyar) for results.
- **Current capture:** `docs/capturas/subir.png`.

### 5.4 Calidad: `/informe/<alcance>/calidad`

- **Must show:** per file, 1 to 5 stars and one sentence on what it lacks ("8 filas sin ID"). Problems grouped by type, with the row number. "¿Es la misma persona?": one case at a time, two records side by side, two buttons, and how many are left above. Rows not counted as repeats, with "Contar de todos modos". In Global: people in both programmes and rows two coordinations recorded the same.
- **Reference:** Antimetal stat (#3) for the grade; Produx accordion (#19) over Revelatio rows (#10) for problems; Hebbia card ×2 (#13) or Trynova ×2 (#14) for the pair; COMINVI modal (#17) for confirmations. Flow from HubSpot (one pair at a time, can reject) and Salesforce (side by side, row per field).
- **Copy from it:** thin-border card with a label on top, twice, with two buttons below.
- **21st.dev:** Star Rating (shadcncraft, read-only with partial fill), Data Table (shadcn), Comparison (muneebable, adapted to record fields), Alert Banner.
- **Known defect** (`docs/defectos-fe.md`): the foot button still says "Continuar con 3 por decidir" after all pairs are decided.
- **Current capture:** `docs/capturas/calidad.png`.

### 5.5 Vista previa: `/informe/<alcance>/vista-previa`

- **Must show, in this order:** the three figures EIRA asked for (people reached, as a range when some records have no identifier; average age; breakdown by city). Then attentions and participations, each apart, with a sentence on why they are not added. Then the Metabase dashboard embedded. Each figure with a note: which files and which cut-off date; the technical detail in a discreet disclosure. Button "Las cifras son correctas".
- **Melenas en Movimiento:** braids donated and donors apart from wigs delivered and beneficiaries. Never added together. Donors are not people reached.
- **Global:** total people is the **sum** of the programmes; below it, as information only, how many appear in more than one programme; then each programme.
- **Presencia territorial, last:** headline in the positive ("Presencia en N municipios de M estados"), per state the list of municipalities with activity and a quiet mosaic (one square per municipality; active ones in vino, the rest in the neutral line, no labels). State total only as small reference text ("de 125 municipios de Jalisco"). No coverage percentage, no "municipios sin atender", no alert colours.
- **Reference:** OhMD stats (#1) for the figures, Antimetal (#3) and Abatable (#5) as alternatives; COMINVI list (#12) for the city breakdown.
- **Copy from it:** large light-weight figure, small label, list with a proportion bar.
- **21st.dev:** Stat Card (konsstepnov) without fake deltas or sparklines; Bar List (sltowl).
- **Dashboard:** Metabase "Impacto" filtered by programme (section 3.4).
- **Ian:** "tenerlo visual (sin que nos haga ver que noe stamos atendiendo full, no es algo primario )".
- **Current capture:** `docs/capturas/vista-previa.png`, `melenas-vista-previa.png`, `global-vista-previa.png`.

### 5.6 Exportar: `/informe/<alcance>/exportar` (and `/informe/<alcance>/informe.csv`)

- **Must show:** the report as it will be delivered, with footnotes, and two actions: download CSV and print or save as PDF.
- **Reference:** Viru Group button (#15) for the primary action, Eduard Bodak (#16) for the secondary; COMINVI modal (#17) or Mecha (#18) for notices.
- **Copy from it:** one pill button in the action colour.
- **21st.dev:** none named. The benchmark says: printable report with Tailwind `print:` utilities.
- **Current capture:** `docs/capturas/exportar.png`.

### 5.7 Metabase dashboards (embedded in Vista previa; also public links)

- **Must show:** "Impacto" and "Calidad", per environment, in EIRA's series colours, full width, filter by programme.
- **Reference:** none beyond Ian's "usaremos metabase". Follow section 3.4.
- **21st.dev:** none.

### 5.8 Routes that only redirect

`/calidad`, `/tablero` and `/informe` redirect to `/`. They belong to the rejected build. Do not design them.

## 6. What is not verified

- No 21st.dev page was opened or captured (403 to automated browsers; two 404). Component names, authors and licences come from one Devin web search and from `web/TERCEROS.md`.
- Ten of the nineteen details.so origins were not measured (six behind a Vercel checkpoint, four not opened).
- There is no dashboard look benchmark. If Ian has dashboard references in mind, they are not written in any file on this VPS.
- Ian has not approved the current look in writing. His last design messages are the ones in section 2 (13:08 and 13:09 CDMX).
- The routes and component paths in this file were read on `main` at commit `c7b0551`. While it was being written, `fe` commit `b8e9d97` ("app shell con sidebar oficial, banda de cifras y componentes del registry") was merged into main. This brief does not describe that shell, and a sidebar conflicts with rows 1 and 2 of section 1 until Ian says otherwise.
