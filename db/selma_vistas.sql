-- Tablas TEMP: solo viven en la conexión de lectura a la base privada.
-- La identidad compuesta reproduce la partición de Selma tras "distinta".
-- Ni estos identificadores ni los nombres de filas se exportan a Metabase.
CREATE TEMP VIEW actividad AS
SELECT s.programa AS iniciativa, s.id AS fuente, f.ciudad, f.periodo, f.servicio,
       t.tipo, f.nac, t.impactada, t.objetos, f.cantidad,
       CASE WHEN coalesce(f.id_h, '') = '' THEN NULL
            WHEN EXISTS (SELECT 1 FROM pares p WHERE p.estado='distinta'
                         AND p.id_h=f.id_h AND p.nombre_h_b=f.nombre_h)
            THEN f.id_h || ':' || f.nombre_h ELSE f.id_h END AS persona
FROM filas f JOIN fuentes s ON s.id=f.fuente
JOIN tipos t ON t.programa=s.programa AND t.tipo=coalesce(nullif(f.tipo,''),s.unidad)
WHERE f.estado='contada' AND f.asistencia;

CREATE TEMP VIEW miembros AS
SELECT DISTINCT iniciativa, persona FROM actividad WHERE impactada AND persona IS NOT NULL;

CREATE TEMP VIEW v_personas_por_programa AS
SELECT s.programa AS iniciativa,
       count(DISTINCT CASE WHEN a.impactada THEN a.persona END) AS personas_impactadas,
       count(DISTINCT CASE WHEN NOT a.impactada THEN a.persona END) AS donantes
FROM (SELECT DISTINCT programa FROM fuentes) s
LEFT JOIN actividad a ON a.iniciativa=s.programa GROUP BY s.programa;

CREATE TEMP VIEW v_global AS
SELECT (SELECT count(*) FROM miembros) AS total_personas_impactadas,
       (SELECT count(DISTINCT persona) FROM miembros) AS personas_unicas_en_total,
       (SELECT count(*) FROM (SELECT persona FROM miembros GROUP BY persona HAVING count(*)>1))
          AS personas_en_mas_de_un_programa,
       (SELECT count(DISTINCT persona) FROM actividad WHERE NOT impactada) AS total_donantes;

CREATE TEMP VIEW v_cruce_programas AS
SELECT a.iniciativa AS programa_a, b.iniciativa AS programa_b, count(*) AS personas
FROM miembros a JOIN miembros b ON a.persona=b.persona AND a.iniciativa<b.iniciativa
GROUP BY a.iniciativa, b.iniciativa;

CREATE TEMP VIEW v_conteos AS
SELECT iniciativa AS iniciativa_id, tipo AS tipo_registro, ciudad, periodo, servicio,
       sum(CASE WHEN objetos THEN cantidad ELSE 1 END) AS total
FROM actividad GROUP BY iniciativa, tipo, ciudad, periodo, servicio;
CREATE TEMP VIEW v_objetos AS
SELECT iniciativa, tipo AS tipo_registro, sum(cantidad) AS cantidad
FROM actividad WHERE objetos GROUP BY iniciativa, tipo;

CREATE TEMP VIEW v_edad AS
WITH nacimientos AS (
  SELECT persona, max(nac) AS nac FROM actividad
  WHERE impactada AND persona IS NOT NULL AND nac<>'' GROUP BY persona
), corte AS (SELECT max(fecha_corte) AS fecha FROM fuentes)
SELECT cast(substr(fecha,1,4) AS integer) - cast(substr(nac,1,4) AS integer)
       - (substr(fecha,6)<substr(nac,6)) AS edad
FROM nacimientos, corte WHERE nac<=fecha;

CREATE TEMP VIEW territorial AS
SELECT a.*, l.clave, l.municipio, l.estado, l.municipios_del_estado
FROM actividad a JOIN lugares l ON l.fuente=a.fuente AND l.ciudad=a.ciudad;
CREATE TEMP VIEW v_presencia_municipios AS
SELECT iniciativa AS iniciativa_id, estado, clave AS municipio_clave, municipio,
       count(*) AS registros, count(DISTINCT persona) AS personas
FROM territorial GROUP BY iniciativa, estado, clave, municipio;
CREATE TEMP VIEW v_presencia AS
SELECT iniciativa AS iniciativa_id, estado, count(DISTINCT clave) AS municipios_con_actividad,
       municipios_del_estado, count(*) AS registros, count(DISTINCT persona) AS personas
FROM territorial GROUP BY iniciativa, estado, municipios_del_estado;

CREATE TEMP VIEW v_calidad AS
WITH volumen AS (
  SELECT fuente, sum(estado='contada') AS nuevas, sum(estado<>'contada') AS omitidas
  FROM filas GROUP BY fuente
)
SELECT s.id AS fuente, s.nombre, s.programa AS iniciativa_id, v.nuevas AS filas_nuevas,
       v.omitidas AS filas_omitidas, s.estrellas, s.puntaje, a.regla, count(a.rowid) AS problemas
FROM fuentes s JOIN volumen v ON v.fuente=s.id LEFT JOIN anomalias a ON a.fuente=s.id
GROUP BY s.id, a.regla;

CREATE TEMP VIEW v_pares_pendientes AS
SELECT id, a_etiqueta AS etiqueta_a, b_etiqueta AS etiqueta_b, motivo, NULL AS probabilidad
FROM pares WHERE estado='pendiente';

-- Atlas filtrable, en una base distinta de la de Metabase. El ordinal solo
-- identifica dentro de la foto; no exportamos HMAC, nombres, filas ni fechas de nacimiento.
CREATE TEMP VIEW atlas_personas AS
SELECT persona, row_number() OVER (ORDER BY persona) AS ordinal
FROM (SELECT DISTINCT persona FROM actividad WHERE persona IS NOT NULL);
CREATE TEMP VIEW atlas_registros AS
SELECT a.iniciativa AS iniciativa_id, a.servicio, a.periodo, p.ordinal AS persona_ef,
       CASE WHEN a.impactada THEN 'impactada' ELSE 'donante' END AS rol_persona,
       1 AS contado, CASE WHEN a.objetos THEN a.cantidad ELSE 1 END AS cantidad,
       coalesce(l.clave,'') AS municipio_clave, coalesce(l.municipio,'') AS municipio,
       coalesce(substr(l.clave,1,2),'') AS estado_clave, coalesce(l.estado,'') AS estado
FROM actividad a LEFT JOIN atlas_personas p ON p.persona=a.persona
LEFT JOIN lugares l ON l.fuente=a.fuente AND l.ciudad=a.ciudad;
CREATE TEMP VIEW atlas_edades AS
WITH nacimientos AS (SELECT persona, max(nac) AS nac FROM actividad
 WHERE impactada AND persona IS NOT NULL AND nac<>'' GROUP BY persona),
corte AS (SELECT max(fecha_corte) AS fecha FROM fuentes)
SELECT p.ordinal AS persona, cast(substr(fecha,1,4) AS integer)-cast(substr(nac,1,4) AS integer)
       -(substr(fecha,6)<substr(nac,6)) AS edad
FROM nacimientos n JOIN atlas_personas p USING(persona), corte WHERE nac<=fecha;
CREATE TEMP VIEW atlas_municipios AS SELECT DISTINCT clave, municipio FROM lugares;
CREATE TEMP VIEW atlas_roles AS SELECT 'impactada' AS clave, 1 AS cuenta_como_impactada UNION ALL SELECT 'donante',0;
CREATE TEMP VIEW atlas_cortes AS SELECT DISTINCT fecha_corte FROM fuentes;
CREATE TEMP VIEW atlas_pendientes AS SELECT 1 AS pendiente FROM pares WHERE estado='pendiente';
