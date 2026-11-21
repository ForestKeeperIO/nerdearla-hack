# Demo integrado EIRA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener en línea, antes de las 15:00, un recorrido completo: subir tres reportes de prueba, que el motor los unifique y deduplique, y ver el resultado en tableros de Metabase dentro del frontend.

**Architecture:** El frontend (Next.js) encola cada archivo en Valkey. Un motor en Python lo toma, lo lee con pandas, omite archivos y filas repetidos con huellas guardadas en Valkey, vincula personas con Splink (sobre DuckDB) y escribe el resultado unificado en una base SQLite. Metabase lee esa base y sirve los tableros, que el frontend incrusta. Valkey es la cola, la memoria de duplicados y el estado en vivo; SQLite es la base de reporte.

**Tech Stack:** Python 3.12 con `uv`, pandas, openpyxl, Splink 4 (motor DuckDB), valkey-py, SQLite, Metabase de código abierto (JAR, Java 21), Valkey 9.2, Next.js (rama `fe`), Vitest y pytest.

**Spec:** `AGENTS.md`, `docs/contrato-valkey.md` (contrato v1, sigue vigente), `docs/contexto/nota-granola-eira.md`, y la sección "Cómo se omiten los duplicados" de `docs/superpowers/plans/2026-11-21-impacto-eira.md`.

## Global Constraints

- Entrega en Devpost a las 16:00 CDMX del 2026-11-21. Corte de funciones a las 15:00.
- Ningún trabajador integra a `main`: cada tarea vive en su rama y se integra solo al pasar su puerta de control.
- El contrato de Valkey v1 no se modifica sin un commit propio a `main`.
- Solo datos ficticios en los reportes de prueba. Los datos públicos llevan fuente y año.
- En Valkey y en SQLite no se guardan nombres completos, teléfonos ni el ID de EIRA en claro; la persona se identifica con un valor opaco.
- Splink propone, una persona decide: solo se unen sin preguntar las personas con el mismo ID de EIRA y el mismo nombre normalizado. Toda otra coincidencia va a `pares_persona` con su probabilidad.
- Sin conteos aproximados. Unidades que no se suman: `atencion`, `estudio`, `participacion`, `entrega_insumo`.
- Licencias: nuestro código es MIT. Metabase es AGPL: se ejecuta como servicio aparte y no se copia código suyo al repositorio. Splink, pandas, DuckDB y Valkey son MIT o BSD.
- Aspecto del frontend: referencias de details.so, reproduciendo el patrón con código propio (sin copiar su código, tipografías de pago ni imágenes). Nada visual se aplica a todas las pantallas sin aprobación de Ian sobre una pantalla de muestra.
- Texto visible en español. Se dice "Valkey", nunca "Redis"; "seudonimizado", nunca "anónimo".
- Protocolo de confirmación (de la auditoría de Devin, `docs/contexto/auditoria-sesion.md`): antes de toda acción con efectos (commit, push, despliegue, lanzar un agente o un trabajador) el agente escribe dos líneas, `Entendí: <acción> en <lugar> con <herramienta>.` y `No haré: <alcance excluido>. ¿Confirmas?`, y espera la respuesta. Sin preguntar solo puede leer, buscar, continuar lo ya aprobado en el mismo turno, o revertir algo que hizo sin permiso.
- Skills: si se invocan dos en un mensaje, se anuncia el orden y se ejecutan una tras otra, reportando tras cada una. Si una skill completa no cabe en el tiempo, se dice antes y se acuerda la versión acotada; no se sustituye por otra cosa.
- La ejecución de este plan se hace con trabajadores de Orca (skill de orquestación), uno por tarea, cada uno en su propio espacio de trabajo; no con procesos lanzados a mano.
- Alcance congelado al aprobar G0: Reto 3; motor en Python con pandas y Splink; Valkey con el contrato v1; SQLite como base de reporte; Metabase para tableros; Next.js para el frontend; referencias visuales de details.so. Nada entra después sin una nueva aprobación explícita.

## Puertas de control

Nada de lo que está a la derecha empieza antes de pasar la puerta.

| Puerta | Qué debe ser cierto | Evidencia | Aprueba | Bloquea |
|---|---|---|---|---|
| G0 Entendimiento | Este plan refleja lo que Ian pidió | Este documento | Ian | Todas las tareas |
| G1 Base de datos | El esquema existe y carga datos de ejemplo | Salida de `pytest db` y de una consulta `sqlite3` | Automática, Ian la ve | Tareas 3 y 4 |
| G2 Reportes de prueba | Los tres reportes y sus derivados existen y cuadran con `esperado.json` | Salida de `pytest reportes` | Automática | Tarea 3 |
| G3 Motor | Los tres reportes pasan de punta a punta y los duplicados se omiten | Salida de `npm run verificar` y de `pytest motor` | Automática, Ian la ve | Tarea 6 |
| G4 Metabase | Metabase corre y muestra los tableros con datos | Captura de cada tablero | Ian | Incrustarlos en el frontend |
| G5 Aspecto | Una pantalla (Subir) rehecha con la referencia de details.so | Captura junto a la referencia | Ian | Aplicar el aspecto a las demás pantallas |
| G6 En línea | El recorrido completo funciona en la dirección pública | Lista de pasos con resultado | Ian | Video y envío |
| G7 Entrega | README, video de respaldo y Devpost | Enlaces | Ian | — |

## Review Focus

1. El mismo reporte con otro nombre, vuelto a guardar o en CSV no cambia ninguna cifra en SQLite ni en Valkey. Prueba en Tarea 3.
2. El motor se cae a media carga: el archivo no queda marcado como cargado y se puede reintentar. Prueba en Tarea 3.
3. Splink da una probabilidad alta a dos personas distintas con el mismo ID: no se unen solas; aparecen en `pares_persona`. Prueba en Tarea 3.
4. Metabase arranca antes de que exista la base o con la base vacía: los tableros muestran "sin datos", no un error. Prueba en Tarea 4.
5. Dos reportes se suben al mismo tiempo: se procesan uno tras otro y ninguno pierde filas. Prueba en Tarea 3.

---

## File Structure

| Ruta | Responsabilidad | Tarea | Rama |
|---|---|---|---|
| `db/esquema.sql`, `db/crear.py`, `db/test_db.py` | Base de reporte SQLite | 1 | `db` |
| `scripts/generar_reportes.py`, `reportes/*.xlsx`, `reportes/esperado.json` | Reportes de prueba | 2 | `reportes` |
| `py/motor/leer.py`, `huellas.py`, `personas.py`, `escribir.py`, `worker.py`, `py/tests/` | Motor: pandas, Valkey, Splink, SQLite | 3 | `motor` |
| `metabase/arrancar.sh`, `metabase/provisionar.py`, `metabase/tableros.json` | Metabase y sus tableros | 4 | `metabase` |
| `web/` | Frontend: aspecto e incrustación | 5 | `fe` |
| `README.md`, `docs/devpost.md`, `scripts/demo.sh` | Arranque del demo y entrega | 6 | `main` |

Las Tareas 1 y 2 corren en paralelo. Las Tareas 3 y 4 arrancan al pasar G1 (la 3 también necesita G2). La Tarea 5 puede preparar la pantalla de muestra desde el inicio.

---

### Task 1: Base de reporte (rama `db`)

**Files:**
- Create: `db/esquema.sql`, `db/crear.py`, `db/test_db.py`, `pyproject.toml` (dependencias de todo el lado Python)

**Interfaces — Produces:** archivo `data/impacto.sqlite` (ruta en `IMPACTO_DB`), con:

```sql
CREATE TABLE fuentes (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, programa TEXT NOT NULL, unidad TEXT NOT NULL,
  fecha_corte TEXT NOT NULL, cargada_en TEXT NOT NULL, por TEXT,
  filas INTEGER, filas_nuevas INTEGER, filas_omitidas INTEGER, inasistencias INTEGER,
  estrellas INTEGER CHECK (estrellas BETWEEN 1 AND 5), puntaje REAL,
  huella_bytes TEXT UNIQUE, huella_contenido TEXT);
CREATE TABLE personas (
  id TEXT PRIMARY KEY,                       -- opaco
  certeza TEXT NOT NULL CHECK (certeza IN ('folio','id')),
  fecha_nacimiento TEXT, ciudad TEXT);
CREATE TABLE registros (
  id TEXT PRIMARY KEY, fuente_id TEXT NOT NULL REFERENCES fuentes(id), fila INTEGER NOT NULL,
  persona_id TEXT REFERENCES personas(id),   -- NULL = sin identificar
  programa TEXT NOT NULL, unidad TEXT NOT NULL CHECK (unidad IN ('atencion','estudio','participacion','entrega_insumo')),
  servicio TEXT, fecha TEXT, periodo TEXT, ciudad TEXT, municipio_clave TEXT,
  cantidad REAL NOT NULL DEFAULT 1, huella_fila TEXT NOT NULL,
  contado INTEGER NOT NULL DEFAULT 1);       -- 0 = fila omitida por repetida
CREATE INDEX registros_huella ON registros(huella_fila);
CREATE TABLE anomalias (id INTEGER PRIMARY KEY, fuente_id TEXT NOT NULL, fila INTEGER, regla TEXT NOT NULL, campo TEXT, detalle TEXT);
CREATE TABLE pares_persona (
  id TEXT PRIMARY KEY, persona_a TEXT NOT NULL, persona_b TEXT NOT NULL, probabilidad REAL,
  motivo TEXT, estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','misma','distinta')),
  decidido_por TEXT, decidido_en TEXT);
CREATE TABLE bitacora (id INTEGER PRIMARY KEY, en TEXT NOT NULL, por TEXT, tipo TEXT NOT NULL, detalle TEXT);
CREATE TABLE denominadores (municipio_clave TEXT PRIMARY KEY, municipio TEXT, mujeres_25_64 INTEGER, fuente TEXT, anio INTEGER);
```

Vistas para Metabase: `v_conteos` (programa, unidad, ciudad, periodo, servicio, total; solo `contado = 1`), `v_personas_por_ciudad`, `v_personas_por_programa`, `v_edad` (persona, edad a la fecha de corte más reciente), `v_cobertura` (ciudad, personas, mujeres_25_64, porcentaje), `v_calidad` (fuente, estrellas, puntaje, problemas por regla), `v_cruce_programas` (programa_a, programa_b, personas en ambos).

- `python -m db.crear [--con-denominadores]` crea la base vacía; con la opción carga `publicos/jalisco_mun_denominadores_2020.csv`.

- [ ] **Step 1:** Pruebas que fallan en `db/test_db.py`: la base recién creada tiene las 7 tablas y las 7 vistas; `unidad` inválida es rechazada; `estrellas = 6` es rechazada; con 3 registros de una persona en 2 programas, `v_cruce_programas` devuelve 1 y `v_personas_por_programa` devuelve 1 por programa; un registro con `contado = 0` no aparece en `v_conteos`; `--con-denominadores` carga 125 filas y `14023` vale 30089.
- [ ] **Step 2:** `uv run pytest db`, esperado FAIL. Escribir `esquema.sql` y `crear.py`. Correr, esperado PASS.
- [ ] **Step 3:** Commit y push de la rama `db`. **Puerta G1:** pegar la salida de pytest y de `sqlite3 data/impacto.sqlite ".tables"`.

### Task 2: Reportes de prueba (rama `reportes`)

**Files:**
- Create: `scripts/generar_reportes.py`, `reportes/*.xlsx`, `reportes/*.csv`, `reportes/esperado.json`, `reportes/README.md`, `scripts/test_reportes.py`

**Interfaces — Produces** (semilla fija; columnas que dijo EIRA):

| Archivo | Programa y unidad | Contenido |
|---|---|---|
| `tamizaje-rosa.xlsx` | Tamizaje Rosa, `atencion` | 120 asistencias, 6 inasistencias, 4 filas repetidas. Columnas `ID`, `Nombre`, `Estudio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha` |
| `salud-que-florece.xlsx` | Salud que Florece, `participacion` | 80 asistencias, 4 inasistencias. Título en la fila 1, encabezados en la fila 3, fila "TOTAL" al final. Columnas `Id usuario`, `NOMBRE COMPLETO`, `Taller`, `EDAD`, `Ciudad`, `Asistió`, `fecha_evento` |
| `nutricion.xlsx` | Nutrición, `atencion` | 40 asistencias; 30 filas idénticas a filas del primero. Columnas `ID`, `Nombre`, `Tipo de servicio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha` |
| `reporte_final_2.xlsx` | — | Copia byte a byte del primero |
| `tamizaje-rosa-reguardado.xlsx` | — | Mismas celdas del primero, columnas en otro orden |
| `tamizaje-rosa.csv` | — | El primero exportado a CSV |
| `tamizaje-rosa_v2.xlsx` | — | El primero más 8 asistencias nuevas |

Entre archivos: 15 personas con el mismo ID en los dos primeros; 2 pares con el mismo ID y personas distintas; 3 personas con el nombre escrito distinto. Anomalías sembradas: 3 fechas inválidas, 2 ciudades desconocidas, 3 ID inválidos, 8 filas sin ID en el primero; 2 fechas futuras y 12 filas sin ID en el segundo. Seis ciudades de Jalisco. El ID sigue el formato de EIRA: tres iniciales y `AAAAMMDD`.

`esperado.json`: por archivo `{ filas, asistencias, inasistencias, sin_id, repetidas_dentro, anomalias }` y globales `{ personas_identificadas, registros_sin_identificar, cruce_tamizaje_florece, pares_mismo_id: 2, variantes_de_nombre: 3, filas_compartidas_nutricion: 30, edad_promedio }`, calculados al construir los datos, no al leerlos.

- [ ] **Step 1:** Pruebas que fallan: existen los 7 archivos; cada Excel tiene los encabezados de la tabla; `esperado.json` dice 120, 80, 40, 2, 3 y 30; `reporte_final_2.xlsx` y `tamizaje-rosa.xlsx` tienen el mismo sha256 y el vuelto a guardar no; correr el generador dos veces produce los mismos datos.
- [ ] **Step 2:** `uv run pytest scripts`, FAIL. Implementar. PASS.
- [ ] **Step 3:** Commit y push de la rama `reportes`. **Puerta G2:** pegar la salida de pytest.

### Task 3: Motor de referencia (rama `motor`; tras G1 y G2)

**Files:**
- Create: `py/motor/leer.py`, `py/motor/huellas.py`, `py/motor/personas.py`, `py/motor/escribir.py`, `py/motor/worker.py`, `py/tests/test_*.py`

**Interfaces:**
- Consumes: esquema de la Tarea 1; reportes de la Tarea 2; claves de `docs/contrato-valkey.md`
- Produces:
  - `leer.leer_reporte(contenido: bytes, nombre: str) -> tuple[pandas.DataFrame, list[dict]]` — columnas normalizadas `id_eira, nombre_norm, servicio, edad, ciudad, municipio_clave, asistio, fecha`; segundo valor = anomalías. Detecta la fila de encabezados entre las 10 primeras y descarta filas de total y vacías
  - `huellas.huella_bytes(contenido: bytes) -> str`; `huellas.huella_fila(fila: dict, clave: bytes) -> str`; `huellas.huella_contenido(huellas: list[str]) -> str`
  - `huellas.evaluar(v, huella_b: str, huellas_f: list[str]) -> dict` con `nivel` ∈ `identico`, `mismo_contenido`, `version_nueva`, `traslape_parcial`, `distinto`, y `mensaje`
  - `personas.vincular(df: pandas.DataFrame, existentes: pandas.DataFrame) -> tuple[pandas.Series, list[dict]]` — identificador opaco por fila y lista de pares `{a, b, probabilidad, motivo}`. Regla: mismo `id_eira` y mismo `nombre_norm` = misma persona; Splink (bloqueo por `id_eira` y por fecha de nacimiento, comparaciones de nombre y fecha) puntúa lo demás; probabilidad ≥ 0.50 genera par pendiente; nada se une solo por probabilidad
  - `escribir.guardar(db, v, fuente: dict, df, anomalias, pares, veredicto) -> None` — SQLite en una transacción y después las claves de Valkey del contrato; las huellas del archivo se registran al final
  - `python -m motor.worker` — ciclo `XREADGROUP` del contrato; un trabajo a la vez

- [ ] **Step 1:** Pruebas que fallan (`py/tests`, Valkey en el puerto 6391 base 15, SQLite temporal):

```python
def test_caso_de_la_guia(motor):
    motor.procesar("tamizaje-rosa.xlsx"); motor.procesar("salud-que-florece.xlsx")
    assert motor.sql("select sum(cantidad) from registros where unidad='atencion' and contado=1") == 120
    assert motor.sql("select sum(cantidad) from registros where unidad='participacion' and contado=1") == 80
    assert motor.sql("select count(*) from personas") == esperado["personas_identificadas"]
    assert motor.sql("select count(*) from pares_persona where estado='pendiente'") == 5

def test_mismo_reporte_con_otro_nombre(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    for nombre, nivel in [("reporte_final_2.xlsx", "identico"), ("tamizaje-rosa-reguardado.xlsx", "mismo_contenido"), ("tamizaje-rosa.csv", "mismo_contenido")]:
        t = motor.procesar(nombre)
        assert t["estado"] == "duplicado" and t["nivel_duplicado"] == nivel and "tamizaje-rosa.xlsx" in t["mensaje"]
    assert motor.sql("select count(*) from fuentes") == 1

def test_version_nueva_solo_agrega_lo_nuevo(motor):
    motor.procesar("tamizaje-rosa.xlsx"); t = motor.procesar("tamizaje-rosa_v2.xlsx")
    assert t["nivel_duplicado"] == "version_nueva" and int(t["filas_nuevas"]) == 8
    assert motor.sql("select sum(cantidad) from registros where unidad='atencion' and contado=1") == 128

def test_traslape_entre_coordinaciones(motor):
    motor.procesar("tamizaje-rosa.xlsx"); t = motor.procesar("nutricion.xlsx")
    assert t["nivel_duplicado"] == "traslape_parcial" and int(t["filas_omitidas"]) == 30

def test_mismo_id_personas_distintas_no_se_unen_solas(motor): ...   # 2 pares con motivo "Mismo ID, nombres distintos"
def test_fallo_a_media_carga_permite_reintentar(motor): ...          # sin fila en fuentes ni huella registrada
def test_dos_trabajos_seguidos_no_pierden_filas(motor): ...
def test_sin_nombres_en_sqlite_ni_valkey(motor): ...
def test_contrato(motor): ...                                        # `npm run verificar` sale con 0 tras procesar los tres
```

- [ ] **Step 2:** `uv run pytest py`, FAIL. Implementar en el orden leer, huellas, personas, escribir, worker. PASS.
- [ ] **Step 3:** Commit y push de la rama `motor`. **Puerta G3:** pegar la salida de pytest y de `npm run verificar`.

### Task 4: Metabase (rama `metabase`; tras G1)

**Files:**
- Create: `metabase/arrancar.sh`, `metabase/provisionar.py`, `metabase/tableros.json`, `metabase/test_metabase.py`, `metabase/README.md`

**Interfaces — Produces:**
- `metabase/arrancar.sh`: descarga el JAR de código abierto a `.metabase/` (ignorado por git), verifica su suma si Metabase la publica, y arranca en el puerto 3200 con su base interna en `.metabase/`
- `metabase/provisionar.py`: por la API de Metabase crea la cuenta de administración (credenciales en `.env`, nunca en el repositorio), conecta `data/impacto.sqlite`, crea las preguntas y tableros de `tableros.json`, activa los enlaces públicos y escribe `metabase/enlaces.json` con `{ "impacto": "<url>", "calidad": "<url>" }`. Es idempotente
- Tablero "Impacto": atenciones y participaciones por separado, personas por ciudad, personas por programa, edad promedio, personas en más de un programa, cobertura por ciudad
- Tablero "Calidad": estrellas por reporte, problemas por regla, filas omitidas por reporte, pares pendientes

- [ ] **Step 1:** Pruebas que fallan: tras provisionar, `enlaces.json` tiene las dos direcciones y cada una responde 200; con la base vacía también responden 200; provisionar dos veces no duplica tableros; cada pregunta de `tableros.json` es una consulta sobre una vista `v_*`, no sobre tablas con datos de persona.
- [ ] **Step 2:** Implementar. Verificar en la documentación de Metabase, no de memoria: el nombre del motor SQLite en la API, la creación de enlaces públicos y los parámetros de arranque.
- [ ] **Step 3:** Commit y push de la rama `metabase`. **Puerta G4:** captura de cada tablero con datos de los reportes de prueba, para aprobación de Ian.

### Task 5: Frontend (rama `fe`)

**Files:**
- Modify: `web/components/ui/star-rating.tsx`, `web/app/page.tsx`, `web/app/tablero/page.tsx`, `web/app/globals.css`
- Create: `docs/referencias/` (capturas de las referencias de details.so usadas)

- [ ] **Step 1:** Corregir el defecto de las estrellas: una calificación de 3 dibuja 3 estrellas llenas del mismo tamaño que las demás. Prueba: `StarRating` con valor 3 produce 3 llenas y 2 vacías.
- [ ] **Step 2 (pantalla de muestra):** rehacer solo **Subir** tomando como referencia el tratamiento de pasos y de filas de details.so (`/inspo/category/steps`, `/rows`, `/list`). Guardar en `docs/referencias/` la captura de cada referencia usada y, junto a ella, la captura de nuestra pantalla. **Puerta G5:** Ian aprueba o corrige. No tocar las demás pantallas antes.
- [ ] **Step 3 (tras G5 y G4):** aplicar el aspecto aprobado a Calidad, Vista previa e Informe. En Vista previa, las cifras exactas de Valkey arriba y, debajo, el tablero "Impacto" de Metabase incrustado desde `metabase/enlaces.json`; en Calidad, el tablero "Calidad". Quitar el espacio muerto de las tarjetas.
- [ ] **Step 4:** `npm run build`, rutas con 200, capturas nuevas en `docs/capturas/`. Commit y push.

### Task 6: Demo en línea y entrega (tras G3, G4 y G5)

- [ ] **Step 1:** `scripts/demo.sh`: arranca Valkey, crea la base, arranca el motor, Metabase y el frontend, y abre el túnel. Imprime la dirección pública.
- [ ] **Step 2:** Recorrido en la dirección pública: subir los tres reportes; ver estrellas y mensajes; subir `reporte_final_2.xlsx` y ver "ya se cargó"; subir la versión 2 y ver "se agregan 8"; Calidad: decidir un par; Vista previa: cifras y tablero de Metabase; Exportar. **Puerta G6.**
- [ ] **Step 3:** README (qué resuelve, cómo levantarlo, arquitectura, implementado / simulado / para piloto, privacidad, costos, licencias de terceros incluida la AGPL de Metabase, cómo se usó Devin), video de respaldo de 90 s y Devpost. **Puerta G7.**

---

## Decisión abierta para G0

El motor es la parte de la compañera de equipo. La Tarea 3 construye un **motor de referencia** en la rama `motor` para garantizar que el demo corra de punta a punta; ella puede tomarlo como base, sustituirlo por el suyo o descartarlo. Si prefieres que nadie más toque esa parte, la Tarea 3 se quita y el demo depende de que su rama llegue antes de las 14:20.

## Sin verificar

- Que Metabase lea SQLite sin configuración adicional en su versión actual y que sus enlaces públicos se puedan incrustar; la Tarea 4 lo comprueba contra su documentación antes de construir.
- Que Splink aporte con cientos de filas: puede que las reglas exactas basten y Splink quede como la pieza de escalabilidad.
- Que el túnel gratuito acepte dos servicios (frontend y Metabase); si no, Metabase se sirve por una ruta del frontend.
- Los encabezados reales de los Excel de EIRA.
