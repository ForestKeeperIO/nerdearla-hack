# SPEC: Impacto EIRA (Reto 3, Nerdearla Vibeathon 2026-11-21)

Escrito el 2026-11-21 a las 14:00 CDMX. Estado del código verificado sobre `main` en `563f185`, leyendo el código y corriendo lo que se indica en cada sección. Los huecos ordenados están en [`SPEC-GAPS.md`](SPEC-GAPS.md).

Marcas: **[inferido]** = conclusión mía, no está en la fuente. **SIN VERIFICAR** = no lo pude comprobar corriendo o leyendo.

## 0. Fuentes

| Clave | Fuente | Estado de lectura |
|---|---|---|
| **G** | Guía de EIRA "Tecnología que transforma vidas. Guía institucional y técnica para participantes", PDF de 10 páginas (sha256 `24f2c838d19e…1783c64`; original en Drive, enlace en `docs/contexto/guia-eira.md`) | Leída completa, página por página. `docs/contexto/guia-eira.md` coincide con el PDF |
| **D** | Devpost: portada y `/rules` de `vibeathon-mexico-2026.devpost.com` | Copia guardada hoy por una sesión anterior. No se volvió a descargar |
| **N1** | Granola "Data management for social impact", 2026-11-21 11:41 CDMX (conversación con EIRA) | Leída hoy por Hermes. **Solo el resumen de IA de Granola.** Sin transcripción (el plan de la cuenta no la da), notas privadas vacías. No hay citas textuales de EIRA |
| **N2** | Granola "Hackathon development tips", 2026-11-21 10:18 CDMX (organizadores) | Igual: solo resumen |
| **N3** | Granola "Erdearla", 2026-11-21 10:16 CDMX | Solo resumen. Es logística (comida, agradecimientos); no aporta requisitos |
| **I** | Decisiones de Ian en `.claude/STATE.md` | Pista interna, no fuente de EIRA |

No leído: transcripciones de N1, N2 y N3; los Excel de ejemplo de EIRA (N1: "Compartir archivos de ejemplo de Excel internos"; no están en el VPS); los otros PDF de la carpeta de recursos (`fin.pdf`, estados financieros 2025, 8 p.; `anexo14.pdf`, 354 p.) no son del reto y no se leyeron. La guía (G p. 9) dice: "Esta guía no establece criterios ni puntuaciones de evaluación"; los criterios salen solo de D.

## 1. Reto, objetivo, criterios y necesidades

### 1.1 Reto y objetivo

- **Reto 3. Consolidación y visualización del impacto social** (G p. 6).
- Objetivo: "Construir una herramienta que reúna datos de diferentes programas y fuentes, facilite su validación y permita a dirección y coordinaciones producir indicadores e informes confiables." (G p. 6)
- Cómo funciona hoy: "Al preparar informes para aliados y donantes, el equipo consolida manualmente distintos archivos. Los principales obstáculos son integración de fuentes, duplicidades, cálculo de indicadores y elaboración de gráficas." (G p. 6)

### 1.2 Requisitos de la guía (Reto 3)

| ID | Requisito, textual | Fuente |
|---|---|---|
| R1 | "Importar archivos de ejemplo CSV/Excel con columnas heterogéneas y mapearlas a un modelo común." | G p. 6 |
| R2 | "Definir un diccionario de datos con unidades, periodos, programa y fuente." | G p. 6 |
| R3 | "Aplicar reglas explícitas de calidad: faltantes, duplicados probables, formatos inválidos y discrepancias." | G p. 6 |
| R4 | "Separar personas únicas, servicios, atenciones, estudios, entregas de insumos y participaciones." | G p. 6 |
| R5 | "Construir filtros por programa, periodo, municipio y tipo de servicio cuando existan datos." | G p. 6 |
| R6 | "Mostrar indicadores y gráficos pertinentes con fecha de corte, denominador y fuente." | G p. 6 |
| R7 | "Exportar un resumen o reporte y conservar trazabilidad de ajustes manuales." | G p. 6 |
| R8 | Problema: "Riesgo de doble conteo cuando una persona aparece varias veces o en varios programas." | G p. 6 |
| R9 | Problema: "Necesidad de explicar de dónde proviene cada indicador y cómo se calculó." | G p. 6 |
| R10 | Caso práctico: "Uno contiene 120 atenciones y otro 80 participaciones; algunas filas corresponden a una misma persona ficticia. El equipo debe explicar qué puede sumar, qué no puede sumar y cómo calcularía un total de beneficiarias únicas solo cuando exista identificación suficiente y una regla validada. El tablero debe mostrar cifras y advertencias sobre calidad de datos." | G p. 6-7 |
| R11 | Qué demostrar: "Importación de dos fuentes sintéticas, mapeo de campos, detección de anomalías, visualización de indicadores diferenciados y exportación de un informe de muestra." | G p. 7 |
| R12 | Límite: "Nunca presentar una deduplicación estimada como cifra oficial sin validación. Si faltan identificadores, mostrar límites de la medición." | G p. 7 |
| R13 | Límite: "Los tableros no deben exponer información personal innecesaria; los datos de prueba serán ficticios." | G p. 7 |
| R14 | Transversales: accesibilidad, conectividad, privacidad ("minimizar datos recolectados, aplicar permisos por rol, cifrado, autenticación, registros de acceso"), operación, sostenibilidad, interoperabilidad ("exportar datos en formatos abiertos"). | G p. 9 |
| R15 | Entregables: prototipo con datos ficticios de inicio a fin; explicación de arquitectura; riesgos, seguridad, operación, costos y próximos pasos; preguntas abiertas y supuestos. "La propuesta debe distinguir claramente lo implementado de lo simulado". | G p. 9; D sección 5 |

### 1.3 Necesidades dichas por EIRA en sala (N1, resumen de Granola)

| ID | Necesidad, según el resumen | Fuente |
|---|---|---|
| E1 | "Registros actuales en Excel, una fila por evento por persona"; columnas "nombre, estudio, edad, ciudad, asistencia, tipo de servicio (ej. nutrióloga)" | N1 |
| E2 | "Cada programa maneja su propio archivo; Presidencia los consolida manualmente"; "concentrar todos los Excels de 3+ coordinaciones es lento y propenso a errores" | N1 |
| E3 | "ID actual: iniciales de apellido paterno, materno, nombre + fecha de nacimiento (AAAAMMDD)"; riesgo de colisiones; mejoras discutidas: iniciales del estado o CURP | N1 |
| E4 | Métricas más pedidas: "Número de personas impactadas", "Edad promedio", "Datos desglosados por ciudad" | N1 |
| E5 | "Preguntas varían por aliado; se necesita un template base con opción de preguntas adicionales" | N1 |
| E6 | "Visión deseada: subir Excel, aplicar filtros de calidad, obtener preview y exportar"; "como un rating tipo Forbes (3 o 4 estrellas)" | N1 |
| E7 | "Identificar los 2 reportes más importantes y sus audiencias. Ejemplo concreto: Tamizaje Rosa para socios estratégicos." | N1 |

Diferencia entre la nota guardada y la primaria: ninguna de fondo. `docs/contexto/nota-granola-eira.md` traduce "template", "preview" y "rating"; la tabla "Lo que se decidió" de ese archivo es de los agentes, no de EIRA.

### 1.4 Criterios del jurado (D, textual)

| ID | Criterio |
|---|---|
| C1 | **Usabilidad**: "¿La herramienta es clara y fácil de usar para el personal de EIRA (brigadas en campo, coordinación, equipo médico)… considerando conectividad limitada y distintos niveles de familiaridad digital?" |
| C2 | **Impacto**: "¿Resuelve los problemas centrales del reto elegido tal como los describe la guía de EIRA, y reduce tareas repetitivas o riesgos reales de su operación?" |
| C3 | **Escalabilidad**: "¿La solución puede adaptarse a nuevas campañas, comunidades u organizaciones sin grandes cambios?" |
| C4 | **Privacidad y confianza**: "¿Cuida los datos de salud de las pacientes?" |
| C5 | **Innovación**: "¿El equipo propuso funcionalidades creativas que aportan valor extra?" |
| C6 | **Funcionamiento real del prototipo**: "¿El flujo crítico del reto funciona de punta a punta con datos ficticios? ¿Queda claro qué está implementado y qué está simulado, y qué haría falta para un piloto real?" |

Los pesos no están publicados. La página `/rules` lista solo C1 a C5; la portada añade C6.

### 1.5 Reglas de entrega (D y N2)

| ID | Regla |
|---|---|
| P1 | Enviar por Devpost antes de las 16:00 CDMX; indicar el reto en el formulario |
| P2 | Equipo de 1 a 4; todos registrados en Nerdearla y Devpost y en el proyecto |
| P3 | Construido el 21 de noviembre de 10:30 a 16:00; no empezado antes |
| P4 | "Demo pitch (2 minutos)": mostrar el proyecto en acción |
| P5 | Repositorio público con licencia open source y README que explique cómo levantarlo y qué credenciales o servicios necesita |
| P6 | Sin datos reales de pacientes |
| P7 | N2: "Priorizar lo que se puede demostrar"; "no perder tiempo en login ni flujos secundarios" |

## 2. Funciones

Estado: **hecho**, **parcial** o **falta**. Rama y commit donde vive.

### F1. Motor de procesamiento (Python)

- **Usuaria:** Presidencia, sin verlo: corre detrás de Subir.
- **Sirve a:** R1, R3, R4, R8, R10, R12, E1, E2, E3.
- **Comportamiento:** toma trabajos del Stream `eira:trabajos`; lee `.xlsx`/`.csv`; encuentra la fila de encabezados; mapea columnas a campos comunes con un diccionario de encabezados (`py/motor/leer.py`); calcula huella de archivo y de fila para omitir duplicados; resuelve personas con reglas exactas y rapidfuzz y manda los casos dudosos a `eira:pares`; califica el archivo con estrellas; escribe conjuntos y conteos en Valkey y filas unificadas en SQLite.
- **Entradas:** `eira:archivo:<id>` (bytes), trabajo con `programa`, `fecha_corte`, `estado_clave`. **Salidas:** `eira:fuente:*`, `eira:per:*`, `eira:cnt:*`, `eira:anom:*`, `eira:pares`, `eira:huellas:*`, `eira:trabajo:<id>` con `mensaje` y `mapeo`; SQLite según `db/esquema.sql`.
- **Aceptación:**
  1. `tamizaje-rosa.xlsx` da 120 atenciones; `melenas-en-movimiento.xlsx` da 80 registros (60 donaciones, 20 entregas) (`reportes/esperado.json`).
  2. `reporte_final_2.xlsx`, `tamizaje-rosa-reguardado.xlsx` y `tamizaje-rosa.csv` no suman ninguna fila nueva y el mensaje nombra el archivo original.
  3. `tamizaje-rosa_v2.xlsx` solo agrega las filas nuevas.
  4. Mismo ID con nombres distintos produce un par pendiente; nunca se une solo.
  5. Ninguna clave `eira:per:*` trae nombre ni ID en claro.
- **Estado:** **hecho** en `main` (integrado desde `motor`; `origin/motor` va 1 commit adelante, `c5e5d08`). Corrí `uv run pytest py db scripts`: 38 en verde, 1 fallo (`test_version_nueva_solo_agrega_lo_nuevo`, justo el criterio 3); esa prueba sola pasa. Causa SIN VERIFICAR. El Excel crudo no se borra de Valkey tras procesar (expira a la hora).
- **Dueño:** Claude (main). La rama `soe_python` de la compañera no tiene hoy cambios propios frente a `main` (`git diff main...origin/soe_python` vacío); su interfaz es el contrato de F4.

### F2. Fuentes reales (datos públicos de Jalisco)

- **Usuaria:** jurado y EIRA, en la versión "con fuentes reales".
- **Sirve a:** C3 y C5 **[inferido]**. Ningún requisito de G ni de N1 lo pide; viene de I.
- **Comportamiento:** cuatro CSV agregados (defunciones C50/C53 de INEGI, egresos hospitalarios, CLUES) en `reportes-reales/`, con scripts de derivación en `scripts/derivar_*.py` y carga con `scripts/cargar_reales.sh`. Entran como tipo `registro_publico`, que no cuenta personas.
- **Aceptación:** los cuatro CSV se procesan sin error y sus conteos coinciden con `reportes-reales/esperado.json`; ninguna cifra de estos datos aparece como "personas impactadas".
- **Estado:** **hecho** en `main` (rama `fuentes-reales`, `6f7d490`). Entorno real arriba en `:3101` (`/api/salud` respondió `ok`, 54 claves). Carga correcta de los cuatro: SIN VERIFICAR. Son datos agregados públicos, no de pacientes (P6 se cumple **[inferido]**).
- **Dueño:** Claude (main).

### F3. Referencias de diseño y paleta

- **Sirve a:** C1. No responde a un requisito de EIRA.
- **Comportamiento:** auditoría de componentes y paleta en `docs/referencias/`; tabla de licencias en el README.
- **Aceptación:** `web/lib/solo-paleta.test.ts` pasa (SIN VERIFICAR: no lo corrí).
- **Estado:** **hecho** como documentación (`referencias`, `9d922e5`). Aplicación completa al frontend: SIN VERIFICAR.
- **Dueño:** Devin; trabajador de STATE/UI-brief.

### F4. Base Valkey y contrato

- **Usuaria:** las dos mitades del sistema; el juez de Valkey.
- **Sirve a:** R4, R8, R12, C3, C4.
- **Comportamiento:** `docs/contrato-valkey.md` define las claves `eira:*`. Stream de trabajos y de decisiones, conjuntos de personas por programa, ciudad, periodo y servicio, hashes de conteo, bitácora, huellas, estado del recorrido. Conteos exactos con `SCARD`/`SINTERCARD`; sin HyperLogLog.
- **Aceptación:** `npm run verificar` da 9 comprobaciones en verde sobre una base sembrada; ninguna clave contiene un nombre de la semilla.
- **Estado:** **hecho** (`valkey-base`, `e9feb5e`, integrado). No corrí `verificar` ni `vitest` de la raíz para no escribir en las bases que usan otros agentes: SIN VERIFICAR hoy. Contradicción menor: `eira:archivo:<id>` guarda el Excel con nombres durante una hora.
- **Dueño:** Claude (main).

### F5. Tableros de Metabase

- **Usuaria:** dirección y coordinaciones que quieren mirar más a fondo.
- **Sirve a:** R5, R6 ("gráficos pertinentes").
- **Comportamiento:** dos tableros (Impacto y Calidad) provisionados por API (`metabase/provisionar.py`) sobre el SQLite del motor; enlaces públicos en `metabase/enlaces.json`; se incrusta en Vista previa.
- **Aceptación:** el `<iframe>` de Vista previa carga desde el navegador de otra máquina por HTTPS; el tablero filtra por programa, periodo, municipio y tipo de servicio; cada tarjeta muestra fuente y fecha de corte.
- **Estado:** **parcial**. Metabase responde en `:3200` (200). Los enlaces son `http://127.0.0.1:3200/…`: no cargan fuera del VPS. Filtros de periodo, municipio y servicio: SIN VERIFICAR. `metabase/test_metabase.py` no corre con `uv run pytest` (falta `requests`).
- **Dueño:** trabajador de Metabase.

### F6. Frontend: recorrido por informe

Next.js en `web/`. Un informe por programa (Tamizaje Rosa, Melenas en Movimiento) y uno Global. Pasos que no se pueden saltar (`web/lib/guardia.ts`, `recorrido.ts`).

| Pantalla | Sirve a | Comportamiento verificado en código | Aceptación | Estado |
|---|---|---|---|---|
| Portada `/` | E6, C1 | Lista de informes con avance; Global bloqueado hasta tener programas | El Global dice por qué está bloqueado | hecho |
| Subir | R1, E2, E6 | `.xlsx`/`.csv` hasta 10 MB, rechaza `.xlsm`; pide programa y fecha de corte; encola en Valkey | Subir el mismo archivo con otro nombre muestra el mensaje de duplicado y no cambia las cifras | hecho |
| Calidad | R3, R10, R12, E3, E6 | Estrellas por archivo con "qué le falta"; anomalías agrupadas por 10 reglas; filas omitidas con "Contar de todos modos"; pares "¿misma persona?" | Cada regla de R3 tiene al menos un caso visible con el archivo de prueba; un par se decide con Sí/No y queda en la bitácora | hecho. **Falta** mostrar el mapeo de columnas (R1, R11) |
| Vista previa | R4, R6, R8, R9, E4 | Personas impactadas (rango si hay registros sin identificar), edad promedio con n, desglose por ciudad, registros por tipo sin sumar, presencia territorial, iframe de Metabase | Las tres cifras de E4 salen con fuente y corte; tipos distintos nunca se suman | parcial: el Global suma personas entre programas (contradice R8); sin filtros (R5); "Cómo se calculó" muestra un comando de Valkey (R9) |
| Exportar | R7, R14 | CSV con indicador, valor, unidad, definición, fecha de corte, fuentes, advertencias; impresión; oculta valores menores a 5 | El CSV abre en Excel con acentos; trae definición y corte por fila | parcial: no trae los ajustes manuales (R7) |

- **Estado general:** **hecho con huecos**, en `main` (`origin/fe` va 1 commit adelante, `db86540`). Hay 8 pruebas e2e de Playwright en `web/e2e/` (SIN VERIFICAR: no las corrí). `/tablero`, `/calidad`, `/informe` son redirecciones de 5 líneas.
- **Dueño:** Devin (rama `fe`).

### F7. Demo en línea

- **Sirve a:** C6, P4.
- **Comportamiento:** `scripts/demo.sh` levanta dos entornos (blanco `:3100`, base 0; real `:3101`, base 1) con túnel de cloudflared; `scripts/humo.sh` los comprueba.
- **Aceptación:** `curl -I` a las dos URL públicas da 200; el recorrido completo de la sección 5 se hace desde un navegador externo.
- **Estado:** **parcial**. A las 13:55 CDMX: `:3101` responde 200; **`:3100` no escucha** (el guion usa justo la versión en blanco). URL públicas: SIN VERIFICAR.
- **Dueño:** Claude (main).

### F8. Entrega (README, Devpost, guion, video)

- **Sirve a:** R15, P1 a P5.
- **Aceptación:** cada fila de la tabla de entrega de `SPEC-GAPS.md` en "cumplido".
- **Estado:** **parcial**. Repositorio público con MIT: verificado. Primer commit 11:25 CDMX de hoy (cumple P3). README con todas las secciones de R15, pero la tabla Implementado/Simulado está desactualizada. `docs/devpost.md` necesita 5 correcciones. Video: sin evidencia.
- **Dueño:** Claude (main); Ian envía.

### F9. Catálogo de iniciativas y modelo de datos

- **Sirve a:** R2, R4, C3.
- **Comportamiento:** `catalogos/iniciativas.json` define tipos de registro (qué se cuenta, si cuenta personas) y roles (beneficiaria, donante); `db/esquema.sql` y `docs/base-de-datos.md` son el diccionario de datos.
- **Aceptación:** agregar una iniciativa al JSON la hace aparecer en la portada sin tocar código.
- **Estado:** **hecho** como archivo y esquema. El diccionario no se ve en la interfaz (R2 no pide que se vea). La aceptación: SIN VERIFICAR.
- **Dueño:** Claude (main).

## 3. Trazabilidad

| Requisito o criterio | Función | Estado |
|---|---|---|
| R1 importar y mapear | F1, F6 Subir | parcial: el mapeo existe y no se muestra |
| R2 diccionario de datos | F9 | hecho (documento y catálogo) |
| R3 reglas de calidad | F1, F6 Calidad | hecho |
| R4 separar unidades | F1, F4, F6 Vista previa | hecho |
| R5 filtros | F5, F6 | parcial: solo por programa |
| R6 indicadores con corte, denominador, fuente | F6 Vista previa, F5 | parcial: corte y fuente sí; denominador solo en edad |
| R7 exportar con trazabilidad de ajustes | F6 Exportar | parcial: exporta; la bitácora no se muestra |
| R8 doble conteo entre programas | F1, F6 | **contradicho** en el Global |
| R9 explicar cada indicador | F6 "Cómo se calculó" | parcial |
| R10 caso práctico 120 + 80 | F1, `reportes/` | hecho |
| R11 qué demostrar | F6, F7 | parcial: falta "mapeo de campos" |
| R12 sin estimaciones; mostrar límites | F1, F4, F6 | hecho (rango por registros sin identificar; pares sin decidir cuentan como una persona y se avisa) |
| R13 sin datos personales de más | F4, F6 | parcial: Excel crudo una hora en Valkey |
| R14 transversales | README | parcial: sin cuentas ni roles (declarado); sin modo sin conexión (no aplica al Reto 3 **[inferido]**) |
| R15 entregables | F8 | parcial |
| E1 columnas de EIRA | F1 | hecho con encabezados supuestos; sin los Excel reales |
| E2 varios archivos | F1, F6 | hecho |
| E3 ID con colisiones | F1, F6 Calidad | hecho |
| E4 tres métricas | F6 Vista previa | hecho |
| E5 plantilla base y preguntas extra | ninguna | **falta** |
| E6 subir, calidad, vista previa, exportar, estrellas | F6 | hecho |
| E7 dos informes por audiencia | F6 (parcial) | falta: hay informe por programa, no por audiencia |
| C1 Usabilidad | F6, F3 | parcial: comandos de Valkey a la vista de Presidencia |
| C2 Impacto | F1, F6 | en riesgo por R8 |
| C3 Escalabilidad | F9, F4 | hecho |
| C4 Privacidad | F4, F6 | parcial |
| C5 Innovación | F1 (tres capas), F6 (estrellas, humano decide), F2 | hecho |
| C6 Funcionamiento real | F7, F5 | en riesgo: `:3100` caído, iframe local |

## 4. Huecos

**Requisitos sin función:** E5 (plantilla con preguntas adicionales), E7 (informes por audiencia), y de R14 los permisos por rol y registros de acceso (declarados como "para piloto").

**Funciones sin requisito (candidatas a recorte o a no enseñar):**

- F2 fuentes reales: ningún texto de EIRA ni de Devpost lo pide. No recortar el código; sí sacarlo del pitch si quita segundos a R8 o R10.
- Presencia territorial con 2,478 municipios: la guía pide filtro por municipio "cuando existan datos", no un mapa de presencia.
- Folio y NFC (`shared/folio.ts`, `web/lib/folio.ts`): son del Reto 1. Sin uso en el recorrido **[inferido]**.
- Splink instalado sin usar.
- Planes de Reto 1 y Reto 4 en `docs/superpowers/plans/`: solo historial.

**Donde lo construido contradice a las fuentes:**

1. Global = suma de programas, contra R8 y R10 (G p. 6-7). Es decisión de Ian (I, 13:12).
2. `docs/devpost.md` dice "Su visión, textual": no hay transcripción, solo resumen (N1).
3. `docs/devpost.md` y el guion dicen que ninguna base guarda nombres: el Excel crudo vive una hora en Valkey.
4. `docs/guion-demo.md` dice que el `.xlsx` de Melenas no existe: sí existe (`reportes/melenas-en-movimiento.xlsx`).
5. El guion dice "como me lo pidió EIRA" de las estrellas: N1 registra una analogía ("como un rating tipo Forbes"), no una petición **[inferido]**.
6. El contrato dice "no escribir en Valkey nombres completos" (AGENTS.md) y el frontend escribe el archivo entero.

## 5. Guion de demo por criterio (2 minutos)

Requiere antes: `:3100` arriba con base en blanco, motor conectado, Metabase alcanzable o sin `enlaces.json`.

| Tiempo | Criterio | En pantalla | Se dice |
|---|---|---|---|
| 0:00-0:20 | C1 Usabilidad | Portada → Tamizaje Rosa → Subir `tamizaje-rosa.xlsx` | "Presidencia junta a mano los Excel de tres coordinaciones. Aquí sube el archivo y lee en español qué pasó. Cuatro pasos, los que nos describió EIRA: subir, calidad, vista previa, exportar." |
| 0:20-0:55 | C2 Impacto | Subir `reporte_final_2.xlsx` (duplicado). Subir `melenas-en-movimiento.xlsx`. Vista previa del Global | "El caso de la guía: 120 atenciones y 80 participaciones. No se suman: son unidades distintas. El mismo archivo con otro nombre no cuenta dos veces. Y este es el total de personas únicas entre programas, con cuántas aparecen en los dos." (requiere el arreglo del hueco 1) |
| 0:55-1:10 | C3 Escalabilidad | Melenas: donaciones y pelucas aparte | "Otro programa, otra naturaleza. Sale de un catálogo: una campaña nueva es una entrada nueva, no código." |
| 1:10-1:30 | C4 Privacidad | Calidad: par "¿misma persona?", decidir; rango de personas | "Su ID puede repetirse entre dos personas. El sistema propone, una persona decide. Si falta identificación mostramos un rango, nunca una estimación. En la base solo hay identificadores opacos." |
| 1:30-1:45 | C5 Innovación | Estrellas del archivo; "Cómo se calculó" | "Cada archivo recibe estrellas con lo que le falta. Cada cifra dice de qué archivos sale y cómo se contó: conteo exacto sobre conjuntos en Valkey." |
| 1:45-2:00 | C6 Funcionamiento real | Exportar → descargar CSV; README, tabla Implementado/Simulado | "El informe sale con definición, fecha de corte y fuente por fila. Lo implementado y lo simulado están separados en el README; faltan cuentas, plantillas por aliado y los Excel reales de EIRA." |
