-- Base de reporte EIRA (Tarea 1 del plan demo-integrado).
-- No se guardan nombres completos ni el ID de EIRA en claro.

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

-- Resuelve identidad -> persona sin guardar el ID de EIRA ni el nombre en claro:
-- clave = HMAC(id EIRA) o HMAC('folio'|nombre normalizado);
-- nombre_clave = HMAC(nombre normalizado). Una misma clave con varias
-- nombre_clave son las candidatas de un par (mismo ID, nombres distintos).
CREATE TABLE IF NOT EXISTS identidades (
  clave TEXT NOT NULL, nombre_clave TEXT NOT NULL,
  persona_id TEXT NOT NULL REFERENCES personas(id), etiqueta TEXT,
  fuente TEXT, fila INTEGER, nacimiento TEXT,
  PRIMARY KEY (clave, nombre_clave));

CREATE TABLE IF NOT EXISTS registros (
  id TEXT PRIMARY KEY, fuente_id TEXT NOT NULL REFERENCES fuentes(id), fila INTEGER NOT NULL,
  persona_id TEXT REFERENCES personas(id),   -- NULL = sin identificar
  programa TEXT NOT NULL, unidad TEXT NOT NULL CHECK (unidad IN ('atencion','estudio','participacion','entrega_insumo')),
  servicio TEXT, fecha TEXT, periodo TEXT, ciudad TEXT, municipio_clave TEXT,
  cantidad REAL NOT NULL DEFAULT 1, huella_fila TEXT NOT NULL,
  contado INTEGER NOT NULL DEFAULT 1);       -- 0 = fila omitida por repetida (o inasistencia)
CREATE INDEX IF NOT EXISTS registros_huella ON registros(huella_fila);
CREATE INDEX IF NOT EXISTS registros_fuente_fila ON registros(fuente_id, fila);
CREATE INDEX IF NOT EXISTS registros_persona ON registros(persona_id);

CREATE TABLE IF NOT EXISTS anomalias (
  id INTEGER PRIMARY KEY, fuente_id TEXT NOT NULL, fila INTEGER,
  regla TEXT NOT NULL, campo TEXT, detalle TEXT);

CREATE TABLE IF NOT EXISTS pares_persona (
  id TEXT PRIMARY KEY, persona_a TEXT NOT NULL, persona_b TEXT NOT NULL, probabilidad REAL,
  motivo TEXT, estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','misma','distinta')),
  decidido_por TEXT, decidido_en TEXT);

CREATE TABLE IF NOT EXISTS bitacora (
  id INTEGER PRIMARY KEY, en TEXT NOT NULL, por TEXT, tipo TEXT NOT NULL, detalle TEXT);

CREATE TABLE IF NOT EXISTS denominadores (
  municipio_clave TEXT PRIMARY KEY, municipio TEXT, mujeres_25_64 INTEGER,
  fuente TEXT, anio INTEGER);

-- Vistas para Metabase -------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_conteos AS
  SELECT programa, unidad, ciudad, periodo, servicio,
         SUM(cantidad) AS total
  FROM registros WHERE contado = 1
  GROUP BY programa, unidad, ciudad, periodo, servicio;

CREATE VIEW IF NOT EXISTS v_personas_por_ciudad AS
  SELECT ciudad, COUNT(DISTINCT persona_id) AS personas
  FROM registros WHERE contado = 1 AND persona_id IS NOT NULL AND cantidad > 0
  GROUP BY ciudad;

CREATE VIEW IF NOT EXISTS v_personas_por_programa AS
  SELECT programa, COUNT(DISTINCT persona_id) AS personas
  FROM registros WHERE contado = 1 AND persona_id IS NOT NULL AND cantidad > 0
  GROUP BY programa;

-- Personas presentes en dos programas distintos (un renglon por pareja).
CREATE VIEW IF NOT EXISTS v_cruce_programas AS
  SELECT a.programa AS programa_a, b.programa AS programa_b,
         COUNT(DISTINCT a.persona_id) AS personas
  FROM registros a
  JOIN registros b ON a.persona_id = b.persona_id AND a.programa < b.programa
  WHERE a.contado = 1 AND b.contado = 1 AND a.cantidad > 0 AND b.cantidad > 0
  GROUP BY a.programa, b.programa;

-- Edad de cada persona a la fecha de corte mas reciente cargada.
CREATE VIEW IF NOT EXISTS v_edad AS
  SELECT p.id AS persona,
         CAST((julianday((SELECT MAX(fecha_corte) FROM fuentes)) - julianday(p.fecha_nacimiento)) / 365.25 AS INTEGER) AS edad
  FROM personas p
  WHERE p.fecha_nacimiento IS NOT NULL;

-- Cobertura: personas unicas por municipio sobre el denominador INEGI 2020.
CREATE VIEW IF NOT EXISTS v_cobertura AS
  SELECT r.ciudad, r.municipio_clave, COUNT(DISTINCT r.persona_id) AS personas,
         d.mujeres_25_64,
         ROUND(100.0 * COUNT(DISTINCT r.persona_id) / d.mujeres_25_64, 2) AS porcentaje
  FROM registros r
  JOIN denominadores d ON d.municipio_clave = r.municipio_clave
  WHERE r.contado = 1 AND r.persona_id IS NOT NULL AND r.cantidad > 0
  GROUP BY r.municipio_clave;

-- Calidad por fuente: un renglon por (fuente, regla) con sus conteos.
CREATE VIEW IF NOT EXISTS v_calidad AS
  SELECT f.id AS fuente, f.nombre, f.estrellas, f.puntaje,
         a.regla, COUNT(*) AS problemas
  FROM fuentes f
  LEFT JOIN anomalias a ON a.fuente_id = f.id
  GROUP BY f.id, a.regla;
