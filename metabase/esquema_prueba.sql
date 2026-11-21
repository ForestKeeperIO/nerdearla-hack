-- Esquema TEMPORAL para la Tarea 4 (Metabase).
-- Copia el SQL de la Tarea 1 del plan docs/superpowers/plans/2026-11-21-demo-integrado.md.
-- Cuando exista origin/motor con db/esquema.sql, se usa ese esquema y este archivo se retira.
-- Las vistas v_* las escribió esta tarea siguiendo los nombres y columnas del plan.

CREATE TABLE IF NOT EXISTS fuentes (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, programa TEXT NOT NULL, unidad TEXT NOT NULL,
  fecha_corte TEXT NOT NULL, cargada_en TEXT NOT NULL, por TEXT,
  filas INTEGER, filas_nuevas INTEGER, filas_omitidas INTEGER, inasistencias INTEGER,
  estrellas INTEGER CHECK (estrellas BETWEEN 1 AND 5), puntaje REAL,
  huella_bytes TEXT UNIQUE, huella_contenido TEXT);
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,                       -- opaco
  certeza TEXT NOT NULL CHECK (certeza IN ('folio','id')),
  fecha_nacimiento TEXT, ciudad TEXT);
CREATE TABLE IF NOT EXISTS registros (
  id TEXT PRIMARY KEY, fuente_id TEXT NOT NULL REFERENCES fuentes(id), fila INTEGER NOT NULL,
  persona_id TEXT REFERENCES personas(id),   -- NULL = sin identificar
  programa TEXT NOT NULL, unidad TEXT NOT NULL CHECK (unidad IN ('atencion','estudio','participacion','entrega_insumo')),
  servicio TEXT, fecha TEXT, periodo TEXT, ciudad TEXT, municipio_clave TEXT,
  cantidad REAL NOT NULL DEFAULT 1, huella_fila TEXT NOT NULL,
  contado INTEGER NOT NULL DEFAULT 1);       -- 0 = fila omitida por repetida
CREATE INDEX IF NOT EXISTS registros_huella ON registros(huella_fila);
CREATE TABLE IF NOT EXISTS anomalias (id INTEGER PRIMARY KEY, fuente_id TEXT NOT NULL, fila INTEGER, regla TEXT NOT NULL, campo TEXT, detalle TEXT);
CREATE TABLE IF NOT EXISTS pares_persona (
  id TEXT PRIMARY KEY, persona_a TEXT NOT NULL, persona_b TEXT NOT NULL, probabilidad REAL,
  motivo TEXT, estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','misma','distinta')),
  decidido_por TEXT, decidido_en TEXT);
CREATE TABLE IF NOT EXISTS bitacora (id INTEGER PRIMARY KEY, en TEXT NOT NULL, por TEXT, tipo TEXT NOT NULL, detalle TEXT);
CREATE TABLE IF NOT EXISTS denominadores (municipio_clave TEXT PRIMARY KEY, municipio TEXT, mujeres_25_64 INTEGER, fuente TEXT, anio INTEGER);

-- Vistas que lee Metabase (según el plan, Tarea 1)

-- programa, unidad, ciudad, periodo, servicio, total; solo contado = 1
CREATE VIEW IF NOT EXISTS v_conteos AS
SELECT programa, unidad, ciudad, periodo, servicio, SUM(cantidad) AS total
FROM registros
WHERE contado = 1
GROUP BY programa, unidad, ciudad, periodo, servicio;

-- ciudad, personas únicas
CREATE VIEW IF NOT EXISTS v_personas_por_ciudad AS
SELECT ciudad, COUNT(DISTINCT persona_id) AS personas
FROM registros
WHERE contado = 1 AND persona_id IS NOT NULL
GROUP BY ciudad;

-- programa, personas únicas
CREATE VIEW IF NOT EXISTS v_personas_por_programa AS
SELECT programa, COUNT(DISTINCT persona_id) AS personas
FROM registros
WHERE contado = 1 AND persona_id IS NOT NULL
GROUP BY programa;

-- persona, edad a la fecha de corte más reciente
CREATE VIEW IF NOT EXISTS v_edad AS
SELECT p.id AS persona,
       CAST((julianday((SELECT MAX(fecha_corte) FROM fuentes))
             - julianday(p.fecha_nacimiento)) / 365.25 AS INTEGER) AS edad
FROM personas p
WHERE p.fecha_nacimiento IS NOT NULL;

-- ciudad, personas, mujeres_25_64, porcentaje de cobertura
CREATE VIEW IF NOT EXISTS v_cobertura AS
SELECT r.ciudad,
       COUNT(DISTINCT r.persona_id) AS personas,
       d.mujeres_25_64,
       ROUND(100.0 * COUNT(DISTINCT r.persona_id) / NULLIF(d.mujeres_25_64, 0), 2) AS porcentaje
FROM registros r
JOIN denominadores d ON d.municipio_clave = r.municipio_clave
WHERE r.contado = 1 AND r.persona_id IS NOT NULL
GROUP BY r.ciudad, d.mujeres_25_64;

-- fuente, estrellas, puntaje, problemas por regla
-- Además expone filas_nuevas y filas_omitidas (necesarias para el tablero Calidad
-- sin consultar la tabla fuentes directamente).
CREATE VIEW IF NOT EXISTS v_calidad AS
SELECT f.nombre AS fuente, f.estrellas, f.puntaje, f.filas_nuevas, f.filas_omitidas,
       COALESCE(a.regla, '(sin problemas)') AS regla, COUNT(a.id) AS problemas
FROM fuentes f
LEFT JOIN anomalias a ON a.fuente_id = f.id
GROUP BY f.id, a.regla;

-- pares de personas pendientes de decisión (solo identificadores opacos)
CREATE VIEW IF NOT EXISTS v_pares_pendientes AS
SELECT id, persona_a, persona_b, probabilidad, motivo, estado
FROM pares_persona
WHERE estado = 'pendiente';

-- programa_a, programa_b, personas en ambos
CREATE VIEW IF NOT EXISTS v_cruce_programas AS
SELECT a.programa AS programa_a, b.programa AS programa_b,
       COUNT(DISTINCT a.persona_id) AS personas
FROM registros a
JOIN registros b ON a.persona_id = b.persona_id AND a.programa < b.programa
WHERE a.contado = 1 AND b.contado = 1 AND a.persona_id IS NOT NULL
GROUP BY a.programa, b.programa;
