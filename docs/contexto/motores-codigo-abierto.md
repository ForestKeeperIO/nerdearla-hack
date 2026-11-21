# Motores de código abierto para el procesamiento

Licencias y actividad consultadas en la API de GitHub el 2026-11-21. Nuestro proyecto es MIT: se puede depender de MIT, BSD y Apache-2.0 (esta última pide conservar su aviso). No se puede incorporar código AGPL ni GPL sin cambiar nuestra licencia.

Ninguna de estas bibliotecas se probó aquí con datos de EIRA; la tabla dice qué son y bajo qué licencia, no que resuelvan el caso sin trabajo.

## Deduplicar personas y registros

| Proyecto | Licencia | Para qué | Nota |
|---|---|---|---|
| [Splink](https://github.com/moj-analytical-services/splink) | MIT | Vinculación probabilística de registros, con explicación de cada coincidencia | Activo. Pensado para volúmenes grandes; para cientos de filas puede ser más de lo necesario |
| [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz) | MIT | Similitud de texto rápida (nombres mal escritos) | Activo |
| [jellyfish](https://github.com/jamesturk/jellyfish) | MIT | Jaro-Winkler y codificación fonética | Activo |
| [dedupe](https://github.com/dedupeio/dedupe) | MIT | Deduplicación con aprendizaje activo | Sin cambios desde julio de 2025 |
| [recordlinkage](https://github.com/J535D165/recordlinkage) | BSD-3-Clause | Caja de herramientas clásica de vinculación | Sin cambios desde febrero de 2024 |
| [pyJedAI](https://github.com/AI-team-UoA/pyJedAI) | Apache-2.0 | Resolución de entidades de punta a punta | Comunidad pequeña |
| [Zingg](https://github.com/zinggAI/zingg) | **AGPL-3.0** | Resolución de entidades | **No usar:** incompatible con MIT |

## Leer, comparar y validar tablas

| Proyecto | Licencia | Para qué |
|---|---|---|
| [pandas](https://github.com/pandas-dev/pandas) | BSD-3-Clause | Leer Excel y unificar columnas |
| [Polars](https://github.com/pola-rs/polars) | MIT | Lo mismo, más rápido |
| [DuckDB](https://github.com/duckdb/duckdb) | MIT | Consultas sobre los archivos, sin servidor |
| [daff](https://github.com/paulfitz/daff) | MIT | Diferencias entre dos versiones de una tabla (filas nuevas, cambiadas, quitadas) |
| [datacompy](https://github.com/capitalone/datacompy) | Apache-2.0 | Comparar dos tablas fila por fila |
| [pandera](https://github.com/unionai-oss/pandera) | MIT | Reglas de calidad declaradas sobre columnas |
| [Great Expectations](https://github.com/fivetran/great_expectations) | Apache-2.0 | Validación de datos con informes; más pesado |
| [frictionless](https://github.com/frictionlessdata/frictionless-py) | MIT | Describir y validar tablas |
| [pyjanitor](https://github.com/pyjanitor-devs/pyjanitor) | MIT | Limpieza de encabezados y columnas |

## Base de datos

| Proyecto | Licencia | Para qué |
|---|---|---|
| [Valkey](https://github.com/valkey-io/valkey) | BSD-3-Clause | La base del proyecto |
| [valkey-py](https://github.com/valkey-io/valkey-py) | MIT | Cliente de Python (`pip install valkey`) |
| [valkey-glide](https://github.com/valkey-io/valkey-glide) | Apache-2.0 | Cliente oficial alterno |
| [valkey-bloom](https://github.com/valkey-io/valkey-bloom), [valkey-search](https://github.com/valkey-io/valkey-search), [valkey-json](https://github.com/valkey-io/valkey-json) | BSD-3-Clause | Módulos; no vienen en el binario que usamos |

## Informes

| Proyecto | Licencia | Para qué |
|---|---|---|
| [WeasyPrint](https://github.com/Kozea/WeasyPrint) | BSD-3-Clause | PDF desde HTML |
| [Evidence](https://github.com/evidence-dev/evidence) | MIT | Informes a partir de consultas |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | Tableros completos; demasiado para un día |
| [Quarto](https://github.com/quarto-dev/quarto-cli) | No clasificada por GitHub | Revisar la licencia antes de usarlo |

## Productos completos del mismo problema, como referencia

| Proyecto | Licencia | Qué enseña |
|---|---|---|
| [OpenRefine](https://github.com/OpenRefine/OpenRefine) | BSD-3-Clause | Cómo agrupar valores casi iguales (método de huella por clave) y cómo pedirle a una persona que confirme |
| [DHIS2](https://github.com/dhis2/dhis2-core) | BSD-3-Clause | Modelo de indicador con numerador, denominador y fuente; lo usan ministerios de salud |
| [KoboToolbox](https://github.com/kobotoolbox/kpi) | **AGPL-3.0** | Captura de datos en campo. Solo para ver, no para copiar |

## Recomendación para hoy

Para el tamaño del caso (cientos de filas), lo más corto es **pandas** para leer y unificar, **RapidFuzz** o **jellyfish** para comparar nombres, **daff** o huellas propias para detectar versiones, y **pandera** si se quieren reglas de calidad declaradas. **Splink** vale como argumento de escalabilidad en el README: es el paso natural cuando EIRA tenga decenas de miles de registros.
