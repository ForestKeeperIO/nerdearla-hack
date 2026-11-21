# Corte al procesador de Selma

**Pin probado: `13a806dee7fd9e00117c02b06264a56b11d30049`. No activar producción sin el GO de nerdearla.** El titular Global suma personas impactadas **por programa**: 130 en Tamizaje + 20 en Melenas = **150**. Hay 130 personas únicas entre programas y 20 en ambos. Las 40 donantes y los registros sin ID no se añaden al titular.

## Lectores y proyector

| Dato | `EIRA_MOTOR=motor` (predeterminado) | `EIRA_MOTOR=selma` |
|---|---|---|
| Roles por programa | `eira:per:impactadas:<id>` / `eira:per:donantes:<id>` | `eira:per:programa:<id>` / `eira:don:programa:<id>`. `rolesDe` elige ambas claves sin probar otras si faltan. |
| Tablero, vista previa y CSV | Roles del motor; Atlas usa `IMPACTO_DB` | Mismo selector para las cifras por programa. Para filtros de lugar, mes y servicio, Atlas consulta `EIRA_TABLERO_DB=…/atlas-selma.sqlite`: ordinales por foto, sin nombres, HMAC ni nacimientos. No abrir el SQLite privado desde la web. |
| Metabase | Vistas del motor | Solo `metabase-selma.sqlite`, separado del Atlas. La tarjeta suma `v_personas_por_programa`; se contrasta con `eira:met:global.personas`. Únicas entre programas = `SCARD eira:per:todas`. |
| Presencia | Motor → `eira:presencia:<alcance>` | El proyector lee `eira.sqlite` en modo `ro` y resuelve ciudad + `estado_clave` de la ficha del trabajo. Cuenta filas contadas con asistencia, no cantidad de objetos. Escribe por programa y Global en un MULTI. Sin estado, omite la ubicación. |
| Archivos | Limpieza del motor y TTL de una hora | `eira-selma-vistas` escucha `eira:eventos`; comprueba estado y retira bytes de `eira:archivo:<trabajo>` en una operación atómica, **solo** en `listo`, `duplicado` o `error`. Reconcilia al suscribirse y cada 60 s por si perdió un aviso. |

[Matriz completa del contrato y diagnóstico previo](contexto/diagnostico-pre-selector-selma.md#claves-del-contrato-y-sus-lectores) · [Pedidos al procesador](pedidos-a-selma.md).

**Manifiesto de la demo:** Tamizaje, su v2, Nutrición y **`py/datos_demo/archivos/melenas-en-movimiento.xlsx` del pin de Selma**. Su Melenas produce 40 filas de donación (60 objetos) y 20 entregas. No usar el homónimo de `reportes/`: el encabezado `Tipo` no se reconoce en ese pin y las 80 filas aparecen como donaciones.

## Tablero y reportes actuales (fase 3)

`/tablero`, `/tablero/version` y los reportes con filtros usan `EIRA_TABLERO_DB` en modo Selma, incluso si también está definido `IMPACTO_DB`. Si falta la ruta del Atlas, es un error de configuración: no se abre la base del otro motor.

| Consulta del frontend | Datos que publica el proyector en el Atlas |
|---|---|
| Cargas recientes y servicios por unidad | `fuentes`: una fila por archivo aceptado (id, programa, nombre, corte, carga UTC, estrellas y puntaje). `v_registros_ef.fuente_id` une cada actividad con su carga; `tipo_registro` la une al plural de `tipos_de_registro`. |
| Revisión de pares y refresco sin recargar | `pares_persona` solo expone estados; `v_pares_pendientes` cuenta pendientes. `bitacora.id` guarda únicamente el último ID de `eira:bitacora`, no su mensaje ni su autor. Los tres se publican en la misma transacción del Atlas. |
| CSV de aliados y territorial | Usan la selección del tablero. Para la tasa de 25 a 64 años, `edad_objetivo` se calcula al día de la atención en la base privada; el informe no necesita una tabla de nacimientos. |

Ensayo de fase 3, base aislada `6398/8`: build limpio de Next, selector 4/4, suite de Selma 7/7. Chromium mantuvo la pestaña abierta durante las cargas: de 0 a 150 personas, cuatro archivos recientes y seis municipios activos en el SVG. Con Melenas + Jalisco quedaron 20 personas tanto en Tablero como en el CSV; agosto mostró comparación con julio. `scripts/cotejar-selma.py` salió `0` con **150 en procesador, Tablero, Metabase, CSV global y CSV de aliados**. También se comprobó la actualización de una copia del Atlas anterior sin rehacer el estado privado. No se ejecutó el corte.

## Evidencia en staging

Valkey aislado en `6396/8`, nuevo SQLite y llave; Next `3196`, Metabase `3296`. Solo datos ficticios.

- `pytest tests_procesador -q`: 7 pasaron. `vitest run lib/claves-roles.test.ts`: 4 pasaron (ambos modos, valor por omisión y configuración inválida). `npm run build`: compilación y TypeScript correctos.
- `python scripts/cargar-demo-selma.py --probar-duplicado`: Tamizaje +120; copia `duplicado/identico` +0; v2 `version_nueva` +8; Nutrición `traslape_parcial` +40; Melenas +60.
- `python scripts/cotejar-selma.py`: comprueba el titular del HTML y el CSV descargado contra la tarjeta **ejecutada** por Metabase y el procesador; exige además un mapa no vacío y consistente (6 municipios).
- Melenas filtrado: 20 impactadas, 40 donantes. Quitando el estado de su ficha y publicando un evento, su mapa quedó vacío; al restaurar `14`, recuperó 6 municipios y 60 registros.
- Prueba por API de archivo inválido: `error` sin bytes. Cero archivos crudos para las cargas listas y duplicadas. El control `procesando` conservó bytes; su evento `listo` los retiró.

## Preparación sin despliegue

Ejecutar desde `integra-selma`, en Bash. El directorio del adaptador y el export de Selma deben quedar fijos y privados. Si la referencia de Selma ya cambió, reutilizar el export previamente verificado del pin, no desplegar su último tip sin pruebas.

```bash
set -euo pipefail
umask 077
PIN=13a806dee7fd9e00117c02b06264a56b11d30049
REL="$HOME/.local/share/eira/releases"; mkdir -p "$REL"
export EIRA_ADAPTADOR=$(mktemp -d "$REL/integra.XXXXXX")
git archive HEAD | tar -xf - -C "$EIRA_ADAPTADOR"
SRC=$(mktemp -d "$REL/selma.XXXXXX")
test "$(git rev-parse origin/soe_python)" = "$PIN"
git archive origin/soe_python | tar -xf - -C "$SRC"
test "$(git rev-parse origin/soe_python)" = "$PIN"
export SELMA_PY="$SRC/py" SELMA_PYTHON="$SRC/venv/bin/python"
uv venv "$SRC/venv"
uv pip install --python "$SELMA_PYTHON" -r "$SELMA_PY/requirements.txt"
(cd "$EIRA_ADAPTADOR/web" && npm ci && npm run build)
export EIRA_ESTADO_DIR="$HOME/.local/state/eira/demo-selma-$PIN"
test ! -e "$EIRA_ESTADO_DIR"; install -d -m 700 "$EIRA_ESTADO_DIR"
```

## Corte, solo con tráfico cerrado y GO explícito

Confirmar respaldo restaurable de la base anterior y que se autoriza **recargar una demo nueva**, no migrar pacientes, decisiones ni aprobaciones. Reservar una base vacía de la misma instancia para guardar la 4 anterior. Nunca `FLUSHDB`. Completar en la misma shell: `RESERVA` (número reservado), `VK` (binario valkey-cli), `APP_URL`, `TABLERO_MB` (URL pública de Impacto), `METABASE_URL`. Inyectar la sesión administrativa de Metabase (`MB_SESSION`) o sus credenciales por entorno; si Valkey requiere contraseña, inyectar `VALKEYCLI_AUTH` al CLI y `VALKEY_PASSWORD` a los servicios mediante sus archivos protegidos.

```bash
: "${RESERVA:?}" "${VK:?}" "${APP_URL:?}" "${TABLERO_MB:?}" "${METABASE_URL:?}"
[[ $RESERVA =~ ^(0|[1-9][0-9]*)$ && $RESERVA != 4 ]]
export VALKEY_URL=redis://127.0.0.1:6379/4 APP_URL TABLERO_MB METABASE_URL
export EIRA_TABLERO_DB="$EIRA_ESTADO_DIR/atlas-selma.sqlite"
CFG="$HOME/.config/eira"; U="$HOME/.config/systemd/user"
cd "$EIRA_ADAPTADOR"
install -d -m 700 "$CFG" "$U/eira-app.service.d"
[[ ! -e "$CFG/selma.env" && ! -e "$CFG/app-selma.env" && ! -e "$U/eira-app.service.d/95-selma.conf" ]]
[[ ! -e "$U/eira-selma.service" && ! -e "$U/eira-selma-vistas.service" ]]
MB_ANTES=$("$SELMA_PYTHON" scripts/conexion-metabase-selma.py)
MB_NUEVA="$EIRA_ESTADO_DIR/metabase-selma.sqlite"
printf '%s\n' "$MB_ANTES" > "$CFG/metabase-antes"
printf '%s\n' "EIRA_ADAPTADOR=$EIRA_ADAPTADOR" "SELMA_PY=$SELMA_PY" \
 "SELMA_PYTHON=$SELMA_PYTHON" "EIRA_ESTADO_DIR=$EIRA_ESTADO_DIR" "VALKEY_URL=$VALKEY_URL" > "$CFG/selma.env"
printf '%s\n' "EIRA_MOTOR=selma" "EIRA_TABLERO_DB=$EIRA_TABLERO_DB" "VALKEY_URL=$VALKEY_URL" > "$CFG/app-selma.env"
install -m 644 scripts/eira-selma{,-vistas}.service "$U/"
printf '[Service]\nWorkingDirectory=%s/web\nEnvironmentFile=%s/app-selma.env\n' \
 "$EIRA_ADAPTADOR" "$CFG" > "$U/eira-app.service.d/95-selma.conf"
systemctl --user daemon-reload
systemctl --user stop eira-app
for flujo in trabajos decisiones; do
  "$VK" -p 6379 -n 4 --json XINFO GROUPS "eira:$flujo" |
    jq -e 'any(.[]; .name=="procesadores" and .pending==0 and .lag==0)' >/dev/null
done
test "$("$VK" -p 6379 -n "$RESERVA" --raw DBSIZE)" = 0
systemctl --user stop eira-motor
test "$("$VK" -p 6379 --raw SWAPDB 4 "$RESERVA")" = OK
test "$("$VK" -p 6379 -n 4 --raw DBSIZE)" = 0
systemctl --user start eira-selma eira-selma-vistas
for i in {1..30}; do [[ -f $EIRA_TABLERO_DB ]] && break; sleep 1; done
test -f "$EIRA_TABLERO_DB"
systemctl --user start eira-app
curl --retry 10 --retry-connrefused -fsS "$APP_URL/api/salud"
"$SELMA_PYTHON" scripts/cargar-demo-selma.py --probar-duplicado
"$SELMA_PYTHON" -m db.exportar_selma  # reconstruir ambas bases de lectura al final de la recarga
"$SELMA_PYTHON" scripts/conexion-metabase-selma.py --desde "$MB_ANTES" --hasta "$MB_NUEVA"
"$SELMA_PYTHON" scripts/cotejar-selma.py
systemctl --user is-active eira-app eira-selma eira-selma-vistas
```

No reabrir tráfico sin cotejo `0` y mapa con datos. Respaldar juntos `eira.sqlite` y su `hmac.key` (0600), fuera de git. Si se desea persistencia al reiniciar: registrar `systemctl --user is-enabled eira-motor`; tras aceptar el corte, `systemctl --user disable eira-motor && systemctl --user enable eira-selma`. El worker solicita el proyector con `Wants=`.

## Vuelta atrás

Solo si el primer intercambio se confirmó y todavía no se admitieron escrituras reales. De lo contrario, guardar y reconciliar el delta antes de volver. Si el corte falló **antes** del intercambio, no hacer el `SWAPDB` inverso.

```bash
systemctl --user stop eira-app eira-selma eira-selma-vistas
test "$("$VK" -p 6379 --raw SWAPDB 4 "$RESERVA")" = OK
MB_ANTES=$(cat "$CFG/metabase-antes")
ACTUAL=$("$SELMA_PYTHON" scripts/conexion-metabase-selma.py)
if [[ $ACTUAL == "$MB_NUEVA" ]]; then
  "$SELMA_PYTHON" scripts/conexion-metabase-selma.py --desde "$MB_NUEVA" --hasta "$MB_ANTES"
else
  test "$ACTUAL" = "$MB_ANTES"
fi
mv "$U/eira-app.service.d/95-selma.conf" "$CFG/95-selma-retirado.conf"
systemctl --user daemon-reload
systemctl --user start eira-motor eira-app
systemctl --user is-active eira-motor eira-app
```

Restaurar la política anterior de arranque si se cambió. **UNVERIFIED**: respaldo, corte/rollback en producción, tráfico público y reinicio de host. No se tocaron los servicios activos ni la base 4.
