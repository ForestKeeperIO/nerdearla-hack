# Metabase (Tarea 4)

Metabase de código abierto (JAR, AGPL — se ejecuta como servicio aparte, no se
copia código suyo al repositorio) provisionado por su API con los tableros
**Impacto** y **Calidad**, con enlace público cada uno.

## Uso

```bash
bash metabase/arrancar.sh                    # descarga el JAR si falta y arranca en :3200
uv run metabase/datos_prueba.py              # SQLite ficticio en data/impacto.sqlite
uv run --with requests metabase/provisionar.py --entorno real --db data/impacto.sqlite
uv run --with requests,pytest pytest metabase/test_metabase.py
```

El JAR, la base interna de Metabase y `credenciales.json` quedan en
`.metabase/` (ignorado por git). Los enlaces públicos quedan en
`metabase/enlaces.json` con la forma `{"impacto": <url>, "calidad": <url>,
"entornos": {...}}`; el frontend incrusta esas direcciones.

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

`--entorno blanco|real` crea una conexión y tableros separados por entorno
(p. ej. `Calidad (blanco)` apunta a una base vacía de control). Es idempotente:
reutiliza base, preguntas y tableros por nombre y el enlace público ya creado.

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

`datos_prueba.py` crea un SQLite temporal con el SQL de la Tarea 1 del plan
(`esquema_prueba.sql`, que incluye las vistas escritas para esta tarea) y unas
decenas de filas **ficticias**: identificadores opacos (`p` + hex), sin nombres
completos ni el ID de EIRA en claro; denominadores marcados como ficticios.
Cuando exista `db/esquema.sql` en la rama del motor, hay que usar ese esquema
y retirar `esquema_prueba.sql`. Ojo con dos desviaciones del plan que el motor
debe adoptar o la Tarea 4 ajustar: `v_calidad` expone `filas_nuevas` y
`filas_omitidas`, y existe una vista extra `v_pares_pendientes` (necesarias
para el tablero Calidad sin consultar tablas directamente).

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
