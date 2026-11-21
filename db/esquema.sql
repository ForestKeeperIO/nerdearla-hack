-- Base de reporte EIRA (Tarea 1 del plan demo-integrado; segunda pasada:
-- programas de naturaleza distinta, roles de persona y trazabilidad
-- territorial). No se guardan nombres completos ni el ID de EIRA en claro.

-- Catalogos, cargados desde catalogos/iniciativas.json y
-- publicos/municipios_mexico.json por db/crear.py.

CREATE TABLE IF NOT EXISTS iniciativas (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, clase TEXT,
  descripcion TEXT, rol_por_defecto TEXT, estado TEXT,
  en_demo INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS tipos_de_registro (
  clave TEXT PRIMARY KEY, etiqueta TEXT, plural TEXT,
  se_cuenta TEXT CHECK (se_cuenta IN ('eventos','objetos')),
  cuenta_personas INTEGER NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS roles_de_persona (
  clave TEXT PRIMARY KEY, etiqueta TEXT,
  cuenta_como_impactada INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS iniciativa_tipo (
  iniciativa_id TEXT NOT NULL REFERENCES iniciativas(id),
  tipo_clave TEXT NOT NULL REFERENCES tipos_de_registro(clave),
  rol TEXT REFERENCES roles_de_persona(clave),
  PRIMARY KEY (iniciativa_id, tipo_clave));

CREATE TABLE IF NOT EXISTS municipios (
  clave TEXT PRIMARY KEY, municipio TEXT NOT NULL,
  estado_clave TEXT NOT NULL, estado TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS municipios_estado ON municipios(estado_clave);

CREATE TABLE IF NOT EXISTS fuentes (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL,
  iniciativa_id TEXT NOT NULL REFERENCES iniciativas(id),
  tipo_registro TEXT,                    -- lo que pidio el trabajo ('', 'segun_fila' o una clave)
  fecha_corte TEXT NOT NULL, cargada_en TEXT NOT NULL, por TEXT,
  filas INTEGER, filas_nuevas INTEGER, filas_omitidas INTEGER, inasistencias INTEGER,
  estrellas INTEGER CHECK (estrellas BETWEEN 1 AND 5), puntaje REAL,
  motivos TEXT,                            -- JSON: textos que ve la persona en la ficha
  huella_bytes TEXT UNIQUE);

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
  iniciativa_id TEXT NOT NULL REFERENCES iniciativas(id),
  tipo_registro TEXT NOT NULL REFERENCES tipos_de_registro(clave),
  rol_persona TEXT REFERENCES roles_de_persona(clave),
  servicio TEXT, fecha TEXT, periodo TEXT,
  ciudad TEXT,                             -- texto tal como venia en el Excel
  estado_clave TEXT, estado TEXT,          -- clave INEGI de entidad y su nombre oficial
  municipio_clave TEXT, municipio TEXT,    -- clave INEGI (5 digitos) y nombre oficial
  cantidad REAL NOT NULL DEFAULT 1, huella_fila TEXT NOT NULL,
  contado INTEGER NOT NULL DEFAULT 1);     -- 0 = fila omitida por repetida (o inasistencia)
CREATE INDEX IF NOT EXISTS registros_huella ON registros(huella_fila);
CREATE INDEX IF NOT EXISTS registros_fuente_fila ON registros(fuente_id, fila);
CREATE INDEX IF NOT EXISTS registros_persona ON registros(persona_id);
CREATE INDEX IF NOT EXISTS registros_lugar ON registros(estado_clave, municipio_clave);

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
  SELECT iniciativa_id, tipo_registro, ciudad, periodo, servicio,
         SUM(cantidad) AS total
  FROM registros WHERE contado = 1
  GROUP BY iniciativa_id, tipo_registro, ciudad, periodo, servicio;

-- Persona efectiva: mientras un par este pendiente, las dos identidades
-- cuentan como UNA (los registros de persona_b cuentan como persona_a).
CREATE VIEW IF NOT EXISTS v_registros_ef AS
  SELECT r.*, COALESCE(
      (SELECT p.persona_a FROM pares_persona p
       WHERE p.persona_b = r.persona_id AND p.estado = 'pendiente'),
      r.persona_id) AS persona_ef
  FROM registros r;

-- Personas impactadas = roles beneficiaria y participante (los que cuentan
-- como impactada segun el catalogo). Donantes y voluntarias van aparte.
CREATE VIEW IF NOT EXISTS v_personas_por_programa AS
  SELECT r.iniciativa_id AS iniciativa,
         COUNT(DISTINCT CASE WHEN ro.cuenta_como_impactada = 1 THEN r.persona_ef END)
           AS personas_impactadas,
         COUNT(DISTINCT CASE WHEN r.rol_persona = 'donante' THEN r.persona_ef END)
           AS donantes
  FROM v_registros_ef r
  LEFT JOIN roles_de_persona ro ON ro.clave = r.rol_persona
  WHERE r.contado = 1 AND r.persona_ef IS NOT NULL AND r.cantidad > 0
  GROUP BY r.iniciativa_id;

CREATE VIEW IF NOT EXISTS v_personas_por_ciudad AS
  SELECT r.ciudad, COUNT(DISTINCT r.persona_ef) AS personas
  FROM v_registros_ef r
  JOIN roles_de_persona ro ON ro.clave = r.rol_persona AND ro.cuenta_como_impactada = 1
  WHERE r.contado = 1 AND r.persona_ef IS NOT NULL AND r.cantidad > 0
  GROUP BY r.ciudad;

-- Personas presentes en dos iniciativas distintas (un renglon por pareja).
CREATE VIEW IF NOT EXISTS v_cruce_programas AS
  SELECT a.iniciativa_id AS programa_a, b.iniciativa_id AS programa_b,
         COUNT(DISTINCT a.persona_ef) AS personas
  FROM v_registros_ef a
  JOIN v_registros_ef b ON a.persona_ef = b.persona_ef AND a.iniciativa_id < b.iniciativa_id
  WHERE a.contado = 1 AND b.contado = 1 AND a.cantidad > 0 AND b.cantidad > 0
  GROUP BY a.iniciativa_id, b.iniciativa_id;

-- Edad de cada persona impactada a la fecha de corte mas reciente cargada.
CREATE VIEW IF NOT EXISTS v_edad AS
  SELECT p.id AS persona,
         CAST((julianday((SELECT MAX(fecha_corte) FROM fuentes)) - julianday(p.fecha_nacimiento)) / 365.25 AS INTEGER) AS edad
  FROM personas p
  WHERE p.fecha_nacimiento IS NOT NULL AND p.id IN (
    SELECT DISTINCT r.persona_ef FROM v_registros_ef r
    JOIN roles_de_persona ro ON ro.clave = r.rol_persona AND ro.cuenta_como_impactada = 1
    WHERE r.contado = 1 AND r.cantidad > 0 AND r.persona_ef IS NOT NULL);

-- Objetos contados (trenzas, pelucas, insumos): tipos que se cuentan como objetos.
CREATE VIEW IF NOT EXISTS v_objetos AS
  SELECT r.iniciativa_id AS iniciativa, r.tipo_registro,
         SUM(r.cantidad) AS cantidad
  FROM registros r
  JOIN tipos_de_registro t ON t.clave = r.tipo_registro AND t.se_cuenta = 'objetos'
  WHERE r.contado = 1
  GROUP BY r.iniciativa_id, r.tipo_registro;

-- Informe global: quien esta en dos programas cuenta dos veces (suma por
-- iniciativa); personas_en_mas_de_un_programa es solo informativo.
CREATE VIEW IF NOT EXISTS v_global AS
  SELECT
    (SELECT COALESCE(SUM(x.n), 0) FROM (
       SELECT COUNT(DISTINCT r.persona_ef) AS n
       FROM v_registros_ef r
       JOIN roles_de_persona ro ON ro.clave = r.rol_persona AND ro.cuenta_como_impactada = 1
       WHERE r.contado = 1 AND r.cantidad > 0 AND r.persona_ef IS NOT NULL
       GROUP BY r.iniciativa_id) x) AS total_personas_impactadas,
    (SELECT COUNT(*) FROM (
       SELECT r.persona_ef FROM v_registros_ef r
       WHERE r.contado = 1 AND r.cantidad > 0 AND r.persona_ef IS NOT NULL
       GROUP BY r.persona_ef
       HAVING COUNT(DISTINCT r.iniciativa_id) > 1)) AS personas_en_mas_de_un_programa,
    (SELECT COUNT(DISTINCT r.persona_ef) FROM v_registros_ef r
       WHERE r.contado = 1 AND r.cantidad > 0 AND r.rol_persona = 'donante')
      AS total_donantes;

-- Cobertura: personas unicas por municipio sobre el denominador INEGI 2020.
CREATE VIEW IF NOT EXISTS v_cobertura AS
  SELECT r.ciudad, r.municipio_clave, COUNT(DISTINCT r.persona_ef) AS personas,
         d.mujeres_25_64,
         ROUND(100.0 * COUNT(DISTINCT r.persona_ef) / d.mujeres_25_64, 2) AS porcentaje
  FROM v_registros_ef r
  JOIN denominadores d ON d.municipio_clave = r.municipio_clave
  JOIN roles_de_persona ro ON ro.clave = r.rol_persona AND ro.cuenta_como_impactada = 1
  WHERE r.contado = 1 AND r.persona_ef IS NOT NULL AND r.cantidad > 0
  GROUP BY r.municipio_clave;

-- Presencia territorial por estado e iniciativa.
CREATE VIEW IF NOT EXISTS v_presencia AS
  SELECT r.iniciativa_id, r.estado,
         COUNT(DISTINCT r.municipio_clave) AS municipios_con_actividad,
         (SELECT COUNT(*) FROM municipios m WHERE m.estado = r.estado)
           AS municipios_del_estado,
         COUNT(*) AS registros,
         COUNT(DISTINCT CASE WHEN r.cantidad > 0 THEN r.persona_ef END) AS personas
  FROM v_registros_ef r
  WHERE r.contado = 1 AND r.municipio_clave <> ''
  GROUP BY r.iniciativa_id, r.estado;

CREATE VIEW IF NOT EXISTS v_presencia_municipios AS
  SELECT r.iniciativa_id, r.estado, r.municipio_clave,
         COALESCE(m.municipio, r.municipio) AS municipio,
         COUNT(*) AS registros,
         COUNT(DISTINCT CASE WHEN r.cantidad > 0 THEN r.persona_ef END) AS personas
  FROM v_registros_ef r
  LEFT JOIN municipios m ON m.clave = r.municipio_clave
  WHERE r.contado = 1 AND r.municipio_clave <> ''
  GROUP BY r.iniciativa_id, r.municipio_clave;

-- Calidad por fuente: un renglon por (fuente, regla) con sus conteos.
CREATE VIEW IF NOT EXISTS v_calidad AS
  SELECT f.id AS fuente, f.nombre, f.iniciativa_id,
         f.filas_nuevas, f.filas_omitidas,
         f.estrellas, f.puntaje, a.regla, COUNT(a.id) AS problemas
  FROM fuentes f
  LEFT JOIN anomalias a ON a.fuente_id = f.id
  GROUP BY f.id, a.regla;

CREATE VIEW IF NOT EXISTS v_pares_pendientes AS
  SELECT p.id, p.persona_a, p.persona_b, p.probabilidad, p.motivo,
         (SELECT i.etiqueta FROM identidades i WHERE i.persona_id = p.persona_a LIMIT 1) AS etiqueta_a,
         (SELECT i.etiqueta FROM identidades i WHERE i.persona_id = p.persona_b LIMIT 1) AS etiqueta_b
  FROM pares_persona p
  WHERE p.estado = 'pendiente';
