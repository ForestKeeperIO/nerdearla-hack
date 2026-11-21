# Reportes reales — cáncer de mama y cervicouterino, Jalisco

Descargados y derivados el 2026-11-21. Todos son datos abiertos oficiales de México, recortados a Jalisco cuando el original es nacional. La clave de unión con `publicos/` es `cvegeo` / `cvegeo_resid` (clave INEGI de 5 dígitos como texto: `14` + municipio de 3 dígitos).

## Archivos

| Archivo | Institución | Título oficial del conjunto | URL de origen exacta | Fecha de descarga | Licencia / términos | Unidad de análisis | Filas | Cómo se obtuvo |
|---|---|---|---|---|---|---|---|---|
| `defunciones_mujeres_jalisco_c50_c53_2024.csv` | INEGI | Estadísticas de Defunciones Registradas (EDR) 2024 — microdatos nacionales | https://www.inegi.org.mx/contenidos/programas/edr/datosabiertos/defunciones/2024/conjunto_de_datos_edr2024_csv.zip | 2026-11-21 | Términos de Libre Uso de la Información Estadística y Geográfica de Interés Nacional de INEGI (atribución requerida): https://www.inegi.org.mx/inegi/terminos.html | Una fila = una defunción registrada de una mujer residente en Jalisco con causa básica C50* o C53* (CIE-10) | 900 | Derivado: `scripts/derivar_defunciones_jalisco.py` (filtros: `ent_resid="14"`, `sexo="2"`, `causa_def` inicia con C50 o C53) |
| `defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv` | INEGI | Mismo conjunto EDR 2024 | (misma URL) | 2026-11-21 | Mismos términos INEGI | Una fila = un mes de ocurrencia × causa (C50/C53), mujeres residentes en Jalisco | 24 | Derivado del mismo script (agregación por `mes_ocurr` × causa) |
| `egresos_hospitalarios_jalisco_c50_c53_2024.csv` | Secretaría de Salud — DGIS/SAEH | Egresos Hospitalarios de la Secretaría de Salud 2024 | http://www.dgis.salud.gob.mx/descargas/datosabiertos/egresos/ssa_egresos_2024.zip?v=2025.05.22 (índice: http://www.dgis.salud.gob.mx/contenidos/basesdedatos/da_egresoshosp_gobmx.html) | 2026-11-21 | Licencia Libre Uso MX / datos.gob.mx (portal nuevo lista CC BY 4.0): https://datos.gob.mx/libreusomx | Una fila = un egreso hospitalario en unidad de la Secretaría de Salud con diagnóstico principal C50* o C53* y residencia en Jalisco | 1,429 | Derivado: `scripts/derivar_egresos_jalisco.py` (filtros: `ENTIDAD="14"`, `AFECPRIN` inicia con C50 o C53) |
| `clues_unidades_salud_jalisco_2026.csv` | Secretaría de Salud — DGIS | Catálogo maestro CLUES (Clave Única de Establecimientos de Salud), corte 2026-10 | http://gobi.salud.gob.mx/gobi/catalogos/catalogosmaestros/ESTABLECIMIENTO_SALUD_202610.xlsx?V=2026.11.11 (índice: http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html) | 2026-11-21 | Licencia Libre Uso MX / datos.gob.mx: https://datos.gob.mx/libreusomx | Una fila = un establecimiento de salud en Jalisco | 2,596 | Derivado: `scripts/derivar_clues_jalisco.py` con `uv run --with openpyxl` (filtro: `CLAVE DE LA ENTIDAD = "14"`) |

## Columnas

### `defunciones_mujeres_jalisco_c50_c53_2024.csv`
- `cvegeo_resid` — clave INEGI de 5 dígitos del municipio de residencia habitual.
- `causa_grupo` — C50 (mama) o C53 (cervicouterino); `causa_cie10` — código completo (p. ej. `C509`).
- `edad_anios` — edad en años cumplidos (decodificada del campo `edad` de EDR, código 4xxx); `grupo_edad` — decenio.
- `escolarida`, `edo_civil`, `derechohab`, `lugar_ocur`, `asist_medi` — claves de catálogo INEGI (ver `diccionario_de_datos` dentro del zip original).
- `anio_ocur`, `mes_ocurr` — ocurrencia; `anio_regis`, `mes_regis` — registro.

### `defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv`
- `anio`, `mes_ocur` (01–12), `causa_grupo`, `defunciones_mujeres` — conteo del mes.

### `egresos_hospitalarios_jalisco_c50_c53_2024.csv`
- `cvegeo_resid` — entidad + municipio de residencia de la paciente/el paciente (`ENTIDAD`+`MUNIC`).
- `clues` — clave de la unidad médica (une con `clues_unidades_salud_jalisco_2026.csv`).
- `fecha_ingreso`, `fecha_egreso`, `dias_estancia` — estancia hospitalaria.
- `edad`, `sexo` (1 hombre, 2 mujer), `derechohabiencia`, `servicio_egreso`, `motivo_egreso` — claves SAEH (catálogos en el zip original).
- `diag_ingreso`, `afec_principal` (CIE-10), `causa_grupo` — C50 o C53.

### `clues_unidades_salud_jalisco_2026.csv`
- `clues` — clave única del establecimiento; `institucion` (IMSS, ISSSTE, SSA Jalisco, privadas…).
- `cvegeo`, `municipio`, `localidad`, `jurisdiccion` — ubicación.
- `tipo_establecimiento`, `tipologia`, `nombre_unidad`, `estatus_operacion`, `nivel_atencion`.

## Nota honesta

Estos datos públicos son **agregados o registros sin identificador de persona**. Sirven para demostrar unificación de fuentes, calificación de calidad, detección del mismo archivo subido dos veces y tableros, pero **no** para demostrar deduplicación de personas: ninguna fila trae nombre ni ID comparable con los Excel de EIRA.

## Lo que no se pudo descargar

- **datos.gob.mx (API y portal nuevo)** — Akamai rechaza peticiones automatizadas (HTTP 403) desde este host; los datasets de IMSS/SSA alojados solo ahí quedaron inaccesibles.
- **IMSS datos abiertos (`datos.imss.gob.mx`)** — el sitio completo respondió HTTP 503 (incluido `istabla44_2024.csv`, detección de cáncer mamario por delegación 2000–2024). URL real confirmada por búsqueda, servidor caído.
- **INEGI EDR 2020–2023 (serie histórica)** — solo el año vigente (2024) está publicado en la ruta `edr/datosabiertos/defunciones/<año>/`; las rutas análogas de años previos responden 404. La serie histórica existe solo vía catálogo RNM con registro.
- **datos.jalisco.gob.mx** — el dominio ya no resuelve DNS.
- **ENSANUT Continua 2022 (INSP)** — las descargas existen pero son formularios POST con IDs base64 en `ensanut.insp.mx/encuestas/ensanutcontinua2022/descargas.php`; no se completó dentro del tiempo disponible.
- **Secretaría de Salud Jalisco / IIEG** — no se encontraron datasets CSV/XLSX de cáncer o salud de la mujer publicados.
