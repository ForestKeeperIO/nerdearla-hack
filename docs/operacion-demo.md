# Operación del demo en línea

Dos versiones del frontend, cada una con su base de Valkey y su SQLite:

| Entorno | Base de Valkey | SQLite | Puerto | Nombre visible |
|---|---|---|---|---|
| `blanco` | `redis://127.0.0.1:6379/0` | `data/blanco.sqlite` | 3100 | En blanco |
| `real` | `redis://127.0.0.1:6379/1` | `data/real.sqlite` | 3101 | Con fuentes reales |
| `prueba` | `…/9` | `data/prueba.sqlite` | 3110 | Prueba (solo ensayos) |

Metabase es una sola instancia en el puerto 3200 (`metabase/arrancar.sh`, rama `metabase`) con una base conectada por entorno; `scripts/demo.sh` no la arranca ni la detiene.

Todo lo efímero vive en `.demo/` (ignorado por git): registros `.demo/<entorno>/*.log`, PID `.demo/<entorno>/*.pid`, la dirección pública en `.demo/<entorno>/url` y la clave HMAC en `.demo/clave` (o `IMPACTO_HMAC_KEY` de `.env` si existe).

## Orden de arranque

1. Valkey ya corre en `127.0.0.1:6379` (no lo gestiona este repo).
2. Metabase en `:3200` si se van a incrustar tableros.
3. `scripts/demo.sh blanco arrancar` y `scripts/demo.sh real arrancar` — o `ambos`.
4. En el entorno real, cargar los datos: `scripts/cargar_reales.sh`.
5. Comprobar: `scripts/humo.sh http://127.0.0.1:3100 --vacio` y `scripts/humo.sh $(cat .demo/real/url)`.

`arrancar` por entorno, en este orden: crea `data/<entorno>.sqlite` si falta (`python -m db.crear --con-denominadores`), lanza el motor (`scripts/arrancar-motor.sh`, si existe), lanza el frontend (`web/`, `npm ci`/`build` si hacen falta) y abre el túnel con cloudflared guardando la dirección pública. Es idempotente: arrancar dos veces no duplica procesos.

## Estado, reinicio y detención

```bash
scripts/demo.sh ambos estado      # tabla: proceso, PID, vivo, puerto/dirección
scripts/demo.sh blanco reiniciar  # detiene y vuelve a arrancar ese entorno
scripts/demo.sh real detener      # mata solo los PID que el script registró
```

`detener` nunca mata por nombre ni toca procesos ajenos (Valkey, Metabase, el frontend viejo del 3100).

## Si el túnel cambia de dirección

`trycloudflare.com` da una dirección distinta en cada arranque del túnel. Si cambia:

```bash
scripts/demo.sh blanco estado            # la dirección vigente está en .demo/blanco/url
```

o para rotarla: matar solo el túnel y volver a abrirlo — `kill $(cat .demo/blanco/tunel.pid)` y luego `scripts/demo.sh blanco arrancar` (el resto sigue igual). La dirección nueva queda en `.demo/blanco/url` y se imprime al arrancar.

## Vaciar el entorno en blanco entre ensayos

Jamás `FLUSHALL`: la base 0 se comparte con otras cosas. Borrar solo las claves del proyecto:

```bash
python3 - <<'PY'
import valkey  # o: uv run --with valkey python
v = valkey.Valkey.from_url("redis://127.0.0.1:6379/0")
cur = 0
while True:
    cur, ks = v.scan(cur, match=b"eira:*", count=500)
    if ks: v.delete(*ks)
    if cur == 0: break
PY
rm -f data/blanco.sqlite
scripts/demo.sh blanco reiniciar   # vuelve a crear la base vacía
```

Si no hay paquete `valkey` a la mano, sirve el `valkey-cli` de `.valkey/` (donde exista): `valkey-cli -n 0 --scan --pattern 'eira:*' | xargs -r valkey-cli -n 0 del`.

## Qué falta para que quede completo

- `web/` viene de la rama `fe`; `scripts/arrancar-motor.sh`, `scripts/procesar_local.py`, `py/motor/`, `db/` y `reportes/` de la rama `motor`; `reportes-reales/` de `fuentes-reales`; `metabase/` de su rama. `demo.sh` avisa qué pieza falta y sigue con las demás.
- La prueba del motor de punta a punta: `scripts/humo_motor.sh --desde motor` (usa la base 8 y un SQLite temporal; no toca los entornos).
- Para ensayar con otra base o puerto: `DEMO_VALKEY_URL`, `DEMO_PUERTO`, `DEMO_DB`, `DEMO_NOMBRE`, `DEMO_WEB_DIR`, o el entorno `prueba` ya cableado a la base 9.
