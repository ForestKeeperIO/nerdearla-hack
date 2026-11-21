# Metabase (Tarea 4)

Metabase de código abierto (JAR, AGPL — se ejecuta como servicio aparte, no se
copia código suyo al repositorio) provisionado por su API con los tableros
**Impacto** y **Calidad**, con enlace público cada uno.

## Uso

```bash
bash metabase/arrancar.sh                    # descarga el JAR si falta y arranca en :3200
uv run python metabase/construir_demo.py     # data/impacto.sqlite, pasando los reportes por el motor real
uv run --with requests metabase/provisionar.py --entorno real --db data/impacto.sqlite
uv run --with requests,pytest pytest metabase/test_metabase.py
```

El JAR, la base interna de Metabase y `credenciales.json` quedan en
`.metabase/` (ignorado por git). Los enlaces públicos quedan en
`metabase/enlaces.json`; el frontend incrusta esas direcciones.

## Entornos y colecciones

`--entorno blanco|real` crea una conexión por entorno y mete preguntas y
tableros en la colección **Impacto EIRA · Real** o **Impacto EIRA · En
blanco**: el entorno se distingue por la colección, no en el título visible
(los nombres son simplemente «Impacto», «Calidad», «Personas impactadas»…).
La primera pasada usaba sufijos `[real]`/`(blanco)`; `provisionar.py` los
renombra y los mueve a su colección conservando ids y enlaces públicos. El
proceso es idempotente: reutiliza base, preguntas y tableros por nombre
dentro de su colección, y el enlace público ya creado.

## Enlaces públicos y filtro por programa

`enlaces.json` tiene, por entorno (`real`, `blanco`):

| Clave | Qué es |
|---|---|
| `impacto` | URL pública del tablero Impacto sin filtrar (el «Global») |
| `impacto_por_programa` | Plantilla de la misma URL con el parámetro de filtro |
| `calidad` | URL pública del tablero Calidad |

El tablero **Impacto** tiene el filtro de dashboard `programa`, conectado a
todas sus preguntas (variable opcional `{{programa}}` en cada SQL nativa).
Para incrustar el tablero de una sola iniciativa se sustituye `{programa}`
por el id de la iniciativa del catálogo (`catalogos/iniciativas.json`):

    <impacto>?programa=tamizaje-rosa
    <impacto>?programa=melenas-en-movimiento

Sin `?programa=` muestra el Global (personas impactadas = suma por programa,
donantes aparte). El filtro también puede elegirse en el propio tablero: el
control «Programa» lista los ids del demo (lista estática; si el catálogo
crece hay que actualizar `values_source_config.values` en
`metabase/tableros.json`).

Las preguntas consultan **solo vistas `v_*`** de `db/esquema.sql` (rama
`motor`): `v_conteos`, `v_personas_por_programa`, `v_presencia`,
`v_presencia_municipios`, `v_calidad` y `v_pares_pendientes`. Las series de
las gráficas usan la paleta de EIRA (`docs/referencias/paleta-eira.md`):
vino `#7d3b3b`, ciruela `#6a2b51`, pizarra `#7e8ba3`, en ese orden.

## Variables

| Variable | Uso | Defecto |
|---|---|---|
| `METABASE_PORT` | Puerto HTTP (`MB_JETTY_PORT`) | `3200` |
| `METABASE_DIR` | Datos de Metabase | `.metabase/` |
| `METABASE_VERSION` | Versión del JAR | `0.65.6` |
| `METABASE_URL` | URL interna de la API | `http://127.0.0.1:3200` |
| `METABASE_URL_PUBLICA` | URL para armar los enlaces públicos (túnel) | `METABASE_URL` |
| `IMPACTO_DB` | Ruta del SQLite a conectar | `data/impacto.sqlite` |
| `MB_ADMIN_EMAIL`, `MB_ADMIN_PASSWORD` | Cuenta de administración | se generan en `.metabase/credenciales.json` |

## Detener y reiniciar

```bash
pkill -f '.metabase/metabase.jar'   # detener
bash metabase/arrancar.sh           # reiniciar (no descarga de nuevo)
```

## Incrustar en iframe

Permitido: las rutas públicas se sirven con `frame-ancestors *` en la CSP y
sin cabecera `X-Frame-Options` (verificado con una página de prueba servida
desde otro puerto: el tablero se renderiza dentro del iframe).

## Datos de demostración

`construir_demo.py` crea el SQLite pasando `reportes/` (Tamizaje Rosa y su
versión nueva, Melenas en Movimiento) y `reportes-reales/` (datos públicos de
Jalisco) por el motor real (`py/motor/worker.py`), con una base de Valkey
propia (la 11; solo borra claves `eira:*`). `--vacia` crea solo esquema y
catálogos.

## Un solo juego de enlaces públicos

`provisionar.py --entorno E --db RUTA --principal E` deja con enlace público
solo los tableros del entorno principal (se recuerda en `enlaces.json`); a
los de cualquier otro entorno se les quita. Las claves de primer nivel de
`enlaces.json` son las del principal. `--db` con otra ruta actualiza la
conexión existente. La dirección pública se recuerda en
`.metabase/url-publica`. Filtros del tablero Impacto por URL: `programa`,
`mes` (AAAA-MM), `municipio`, `servicio`; las listas salen de la base y del
catálogo al provisionar. `tableros.json` admite tarjetas de texto y los
marcadores `@PROGRAMA(col)@`, `@PUBLICAS@`, `@PROGRAMAS_DEL_DEMO@` y
`@VALORES(col)@`.

## Fuentes consultadas (verificado contra el código, no de memoria)

Metabase v0.65.6 en github.com/metabase/metabase:

- `src/metabase/setup_rest/api.clj` — `POST /api/setup` `{token, user:{email,password,first_name,last_name}, prefs:{site_name,site_locale}}`; el `token` sale de `GET /api/session/properties` (`setup-token`).
- `src/metabase/session/api.clj` — `POST /api/session` `{username, password}` devuelve `{id}` que va en la cabecera `X-Metabase-Session`.
- `src/metabase/warehouses_rest/api.clj` — `POST /api/database` `{name, engine, details, is_full_sync, auto_run_queries}`; `GET /api/database` devuelve `{"data": [...]}`.
- `src/metabase/driver/sqlite.clj` — motor `"sqlite"`, `details: {"db": "<ruta>"}`.
- `src/metabase/queries_rest/api/card.clj` — `POST /api/card` `{name, dataset_query:{type:"native",database,native:{query}}, display, visualization_settings}`.
- `src/metabase/dashboards_rest/api.clj` — `POST /api/dashboard`, `PUT /api/dashboard/:id` con `dashcards` (id negativo = tarjeta nueva), `POST /api/dashboard/:dashboard-id/public_link` → `{uuid}` (idempotente).
- `src/metabase/settings_rest/api.clj` — `PUT /api/setting/:key` `{value}`.
- `src/metabase/public_sharing/settings.clj` — ajuste `enable-public-sharing`.
- URL pública: `{site-url}/public/dashboard/{uuid}`.

Documentación: https://www.metabase.com/docs/latest/databases/connections/sqlite y
https://www.metabase.com/docs/latest/embedding/public-links (metabase.com
bloquea algunos clientes automáticos: por eso se verificó contra el código).
