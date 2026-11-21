# Integración con el procesador de Selma

**No hacer el corte todavía.** El trabajador de Selma procesa las cargas; Metabase consume una copia de lectura de su SQLite. Con el frontend `6abb898`, el tablero y el CSV devuelven **0** aunque Metabase y el procesador devuelven **245**. Además, uno de los Excel de prueba pierde la distinción entre donar cabello y recibir una peluca. No se cambió `web/`, la rama de Selma ni el entorno en línea.

Procesador probado: `13a806dee7fd9e00117c02b06264a56b11d30049`. Integración: rama `integra-selma`, creada desde `origin/main@6abb898`. El análisis anterior de Claude queda al final como historial, **no** como guía de corte.

## Una cifra, una definición

| Indicador | Lectura de Selma | Qué deben mostrar los tres lectores |
|---|---|---|
| **Personas impactadas** (titular) | Por programa: `SCARD eira:per:programa:<id>`; Global: `HGET eira:met:global personas` = suma de esas cardinalidades | Tablero, tarjeta «Personas impactadas» y CSV `personas_impactadas`: **245** en esta prueba (225 de Tamizaje + 20 de Melenas). Una persona identificada cuenta una vez **por programa** en el que recibió atención o participó. Es la definición del Global de Selma y la decisión de Ian en la especificación, § «Un informe por programa, y uno global». |
| Personas únicas entre programas (dato distinto) | `SCARD eira:per:todas` = `met:global.personas_unicas_en_total` | **226** después de la segunda decisión. No llamar «personas únicas globales» al titular anterior. `personas_en_mas_de_un_programa` = **19**; no restarlo de la suma en general (una persona podría estar en tres programas). |
| Donantes por separado | `eira:don:programa:<id>`; `SCARD eira:don:todas` para personas únicas globales | **108** según el procesador en este corpus, **no** una cifra validada de impacto. `met:global.donantes` suma por programa; no equivale siempre a la unión. Los conjuntos `don` agrupan todos los roles no impactados. |
| Registros sin identificar | `HGETALL eira:sinid`, o `met:global.sin_identificar` | **26 registros**; ni personas adicionales ni parte del titular. Si se conserva un máximo posible, rotularlo como advertencia, no como total confirmado. |

**Para Devin FE:** en modo Selma, `web/lib/datos.ts:rolesDe` debe usar `perPrograma(id)` en vez de `perImpactadas(id)` y `eira:don:programa:<id>` en vez de `perDonantes(id)`. La suma y la unión ya se calculan en ese lector; lo comparten tablero, vista previa y CSV. No usar «si el conjunto no existe, probar el otro»: cero puede ser correcto y una clave antigua puede existir. Seleccionar el motor explícitamente o retirar el lector anterior al corte. Para el titular de la vista previa, no usar el rango. No sembrar alias: el procesador elimina `eira:per:*` en cada proyección.

## Claves del contrato y sus lectores

Prefijo `eira:` implícito en la tabla. Es una comparación con **contrato v1**, no una modificación unilateral de ese contrato. Antes de generalizar el nuevo significado de `per:*`, acordar versión, documentarla en `docs/contrato-valkey.md` y avisar a ambos lados.

| Clave | Contrato / motor anterior | Selma en el tip probado | Consumidor / acción |
|---|---|---|---|
| `archivo:<trabajo>` | Bytes, TTL 3600 s; motor borra al terminar | Lee los bytes, conserva el TTL | API de subida; hay 14 archivos crudos tras el primer recorrido. |
| `trabajos` / `trabajo:<id>` | Stream grupo `procesadores`; ficha pendiente, luego estado, mensaje, fuente/original, `filas*`, mapeo y fecha | Mismo grupo, claves y campos en cargas y duplicados. Solo acepta tipos del catálogo, no `segun_fila`/vacío | `/api/subir` → worker → `/api/trabajos`. Usar `donacion` en datos mixtos de Melenas; no arregla por sí solo el encabezado `Tipo`. |
| `decisiones` / `pares` | Stream `persona` (`misma`/`distinta`) o `restituir_fila`; hash JSON con `a`,`b`, estado, motivo | Interfaz compatible; personas, pares y fuentes llevan IDs propios, no migrables copiando claves | Calidad, auditoría; `v_pares_pendientes` muestra etiquetas, no inventa una probabilidad. |
| `fuentes` / `fuente:<id>` | Zset por fecha Unix; hash nombre, programa, unidad, corte, carga, calidad, volúmenes | Mismos tipos/campos; las omitidas de la ficha incluyen repetidas internas | Lista de fuentes, informes, `v_calidad`. Las omitidas y repetidas del **trabajo** se desglosan. |
| `anom:<id>` / `omitidas:<id>` | Listas JSON por fila, sin nombres personales | Sí; solo si hay elementos | Calidad, lista y restitución. |
| `per:todas`, `per:programa:<id>` | Motor anterior incluye donantes | **Solo impactadas identificadas** | Filtros, cruce y lectores de roles nuevos. |
| `per:impactadas:<id>` / `per:donantes:<id>` | Conjuntos separados por rol | No existen; equivalentes `per:programa:<id>` / `don:programa:<id>` | Dos cambios de lectura FE; causas verificadas de ceros en tablero e informe. |
| `don:todas` / `don:programa:<id>` | No están en v1 | Conjuntos aparte, se permite pertenecer también a `per:*` por otro evento | No sumar donantes a impactadas. |
| `per:ciudad:*`, `per:periodo:*`, `per:servicio:*`, `per:certeza:folio` / `id`, `nac` | Conjuntos por dimensión; hash ID opaco → nacimiento | Mismas claves, restringidas a impactadas | Filtros, certeza y edad. `per:tipo:*` es extensión propuesta, no escrita: «no disponible», no 0 personas. |
| `cnt:<unidad>` / `sinid` | Hash `programa\|ciudad\|periodo\|servicio` | Sí. Inasistencias fuera del alcance; suma cantidad para tipos de objetos, de otro modo eventos | Tablero, informe y `v_conteos` / `v_objetos`. Nunca sumar personas, atenciones y objetos. |
| `valores:programa`, `ciudad`, `periodo`, `servicio` | Conjuntos de opciones | Sí; sin `valores:estado` adicional del motor | Filtros FE. |
| `met:<programa>`, `met:global` | No están en v1 | Hash con personas, donantes, unidades, edad, sin ID, fuentes, etc.; Global distingue suma/únicas/cruce | Oráculo de comparación. El lector FE `6abb898` no los lee. |
| `presencia:<alcance>` | Hash INEGI de 5 dígitos → **filas** con actividad | No lo escribe. Tampoco persiste `estado_clave` en SQLite | El mapa FE no tiene datos. Para SQL se usa ciudad + estado de la ficha del trabajo; si falta, se omite, no se supone Jalisco. |
| `huellas:archivo` / `huellas:fila` | Memoria del motor en Valkey | `fuentes.sha256/canon` y `filas.huella` en SQLite. No usa `huellas:contenido` | El worker no reconoce como procesados los archivos de otro motor; no compartir base. |
| `bitacora` / canal `eventos` | Stream de auditoría / Pub/Sub | Escribe y publica trabajos, fuentes y decisiones | Calidad y refresco. Pub/Sub no sustituye a la lectura de estado. |
| `contrato` / `den:*` / `informe:<alcance>` | Versión, denominadores y estado de aprobación del frontend | Escribe `contrato=1`; no toca denominadores ni aprobaciones | No usar `contrato=1` para detectar el motor: los significados difieren. |

## Prueba reproducida en staging

Entornos aislados en loopback: Valkey `6395/8`, Next compilado `:3195`, Metabase `:3296` con H2 independiente. Solo datos ficticios. `npm ci` en la copia falló por falta de disco; se usaron dependencias ya instaladas con el mismo SHA-256 de `web/package-lock.json`. **El build de producción y el servidor sí se ejecutaron.** No se verificó una instalación npm limpia en esta sesión.

| Comando o lector | Salida observada |
|---|---|
| En `py/` del export de Selma, `PATH="<binarios Valkey>:$PATH" uv run --no-project --with-requirements requirements.txt python -m pytest tests_procesador -q` | `7 passed in 6.54s`, sin skips; el fixture levantó sus propios servidores en puertos libres. |
| `npm run build`, `next start -H 127.0.0.1 -p 3195`, `curl :3195/api/salud` | Compilación, TypeScript y tabla de rutas; al inicio `{"ok":true,"valkey":"PONG","claves":0}`. |
| `POST /api/subir` multipart por los 7 archivos de `reportes/` y 8 de `py/datos_demo/archivos/`; luego `GET /api/trabajos?alcance=global` | 7 `listo`, 7 `duplicado`, 7 fuentes. `reportes/nutricion.xlsx` con `comunidades-de-origen` (su programa documentado) recibió HTTP 400 **antes de encolar**: el catálogo de informes activos del demo no lo ofrece. No se reclasificó. |
| Copia idéntica / re-guardado / CSV | `reporte_final_2.xlsx`: `duplicado identico`, +0, fuentes=1. Re-guardado y CSV: `duplicado mismo_contenido`, fuentes=1; la copia, re-guardado, otro orden y CSV de Selma tampoco añadieron fuentes. |
| Versiones de Tamizaje | Nuestra v2: `listo version_nueva`, 138 filas, **8 nuevas**, 126 omitidas, 4 repetidas. Su v2: 130, **8 nuevas**, 120 omitidas, 2 repetidas. Su Nutrición: `traslape_parcial`, **40 nuevas**, 30 omitidas. |
| `XADD eira:decisiones '*' tipo persona par par-4f17a105 decision distinta por staging` (el ID depende de la llave) | En este estado: `pendiente → distinta`, `XPENDING=0`. Suma/únicas/cruce: `245/225/20 → 245/226/19`. El exportador en ejecución reflejó la decisión sin intervención. |
| `sqlite3 -readonly "$EIRA_ESTADO_DIR/metabase-selma.sqlite" 'SELECT * FROM v_global'` | `245\|226\|19\|108`. La conexión de Metabase apunta al export, **no** al SQLite privado que contiene nombres normalizados. |
| API pública de Metabase: `GET /api/public/dashboard/<uuid>/dashcard/37/card/40` | HTTP 202, `status=completed`, `data.rows=[[245]]`. Las **10 tarjetas de Impacto y 7 de Calidad** se ejecutaron con `completed`; entre ellas edad `45.2 años`, municipios `6`, donantes `108`, fuentes `7`. |
| `python scripts/cotejar-selma.py` con `VALKEY_URL`, `APP_URL`, `TABLERO_MB` de staging | `Procesador=245; Tablero=0; Metabase=245; Informe CSV=0` → **exit 1**, no se sembraron alias. Lee HTML, tarjeta por API pública y el CSV descargado, no solo SQLite. |
| Reiniciar **solo el worker aislado** con `bash scripts/arrancar-selma.sh`, volver a subir Tamizaje con otro nombre | `duplicado identico 0`; `245/226/19` antes y después. Llave persistente `0600`; arrancar con otro estado vacío contra el mismo Valkey fue rechazado antes de crear otra llave. |
| Reaplicar `distinta` tras reiniciar | Nueva entrada en bitácora y PEL vacío; exactamente los mismos 226 identificadores de impactadas, sin imprimirlos. |
| `systemd-analyze --user verify scripts/eira-selma{,-vistas}.service`; `pytest -q db scripts` | Unidades válidas; 16 pruebas del repositorio pasaron. No se instalaron las unidades de producción. |
| Ejecutar los dos entrypoints bajo `systemd-run --user`, en unidades transitorias privadas `eira-prueba-6395-{worker,vistas}`, con el mismo SQLite, llave y base 8 | Ambos `active`. Otra decisión `misma` llegó por el stream a Valkey y después a la tarjeta pública real de Calidad: **5 → 4 pares pendientes** sin reiniciar Metabase ni recalcular a mano. |

**La concordancia técnica no prueba que un Excel esté bien clasificado.** En el archivo nuestro de Melenas, SQLite agrupó 80/0 en lugar de las 60 donaciones y 20 entregas del Excel. En el de Selma sí separó 40 donaciones (60 objetos) y 20 entregas. [Pedidos a Selma](pedidos-a-selma.md).

## Preparar el release (no activa producción)

Los comandos son para Bash. Ejecutar desde la rama de integración. Si llega un tip nuevo, **no** desplegarlo por ser más reciente: exportar, probar otra vez y actualizar el pin.

```bash
set -euo pipefail
umask 077
git fetch origin
PIN=13a806dee7fd9e00117c02b06264a56b11d30049
test "$(git rev-parse origin/soe_python)" = "$PIN"
RELEASE=$(mktemp -d "${TMPDIR:-/tmp}/eira-selma.XXXXXX")
git archive origin/soe_python | tar -x -C "$RELEASE"
test "$(git rev-parse origin/soe_python)" = "$PIN"
ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/eira/releases/$PIN"
test ! -e "$ROOT"
mkdir -p "$(dirname "$ROOT")"
mv "$RELEASE" "$ROOT"
uv venv "$ROOT/venv"
uv pip install --python "$ROOT/venv/bin/python" -r "$ROOT/py/requirements.txt"
export SELMA_PY="$ROOT/py" SELMA_PYTHON="$ROOT/venv/bin/python"
export EIRA_ADAPTADOR="$(git rev-parse --show-toplevel)" # mantener este release fijado
export EIRA_ESTADO_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/eira/selma"
install -d -m 700 "$EIRA_ESTADO_DIR"
```

En staging limpio: iniciar un Valkey privado sin persistencia, asignar `VALKEY_URL=redis://127.0.0.1:<puerto>/8` a app, worker y exportador. En tres terminales: `bash scripts/arrancar-selma.sh`, `"$SELMA_PYTHON" -m db.exportar_selma --seguir`, y el `next start` del build probado. La primera terminal genera `hmac.key` de uso exclusivo en el directorio de estado (no se imprime, no se versiona); nunca regenerar la llave de un SQLite existente. El exportador mantiene diez vistas en otro archivo: datos de lectura en transacciones, sin filas crudas, ID de EIRA, fecha de nacimiento ni llave. Solo el worker recibe la llave.

Ejemplo de carga **solo staging** (repetir con los archivos de la tabla; Melenas con `programa=melenas-en-movimiento` y `unidad=donacion`):

```bash
curl -fsS "$APP_URL/api/subir" -F archivo=@reportes/tamizaje-rosa.xlsx \
  -F programa=tamizaje-rosa -F unidad=atencion -F fecha_corte=2026-11-21
curl -fsS "$APP_URL/api/trabajos?alcance=global"
export TABLERO_MB   # URL pública de Impacto de la instancia aislada, no la de producción
"$SELMA_PYTHON" scripts/cotejar-selma.py
```

## Corte condicionado — no ejecutar ahora

**Requisitos:** visto bueno explícito de nerdearla, prueba anterior en verde con el FE aprobado y Excel bien clasificado, ventana sin escrituras, respaldo verificado del estado anterior. No iniciar Selma con SQLite nuevo sobre Valkey antiguo: el primer trabajo reemplazaría la proyección y los IDs no coinciden. No usar `FLUSHDB`, ni ejecutar ambos consumidores a la vez.

Preparar primero **otra base reservada** de la **misma instancia** que la base 4 (no copiar la instancia temporal `6395`). Verificar que estaba libre, reprocesar en ella el manifiesto aprobado de archivos originales con el estado y llave definitivos y reconciliar las decisiones humanas. La app de prueba debe usar esa base. Conseguir la paridad con las tres lecturas; el cambio de base intercambiará los juegos completos de claves, incluidas colas, consumidores, fuentes y fichas de trabajo. La base antigua se conserva íntegra para volver atrás (los TTL siguen su curso). No copiar HMACs, pares o huellas entre motores.

El operador debe fijar `CANDIDATA` al número reservado, `VK` al ejecutable de `valkey-cli`, `FE_WEB` al directorio `web` del build ya probado, y las variables `EIRA_*`/`SELMA_*` del release anterior. Nombrar las unidades temporales de la candidata `eira-candidata-app`, `eira-candidata-worker` y `eira-candidata-vistas`; no usar las unidades de producción para el ensayo. `METABASE_URL` debe ser la instancia correcta; usar sesión administrativa inyectada (`MB_SESSION`) o credenciales de administración por entorno, nunca en git ni en argumentos. Si no se conoce alguno, **detenerse**. Desactivar tráfico de entrada hasta verificar o completar rollback.

```bash
set -euo pipefail
: "${CANDIDATA:?}" "${VK:?}" "${FE_WEB:?}" "${EIRA_ADAPTADOR:?}" "${EIRA_ESTADO_DIR:?}"
: "${SELMA_PYTHON:?}" "${SELMA_PY:?}" "${METABASE_URL:?}"
[[ $CANDIDATA =~ ^(0|[1-9][0-9]*)$ && $CANDIDATA != 4 ]]
test -f "$FE_WEB/.next/BUILD_ID"
cd "$EIRA_ADAPTADOR"
[[ -f "$EIRA_ESTADO_DIR/hmac.key" && -f "$EIRA_ESTADO_DIR/eira.sqlite" ]]
CFG="$HOME/.config/eira"; UNITS="$HOME/.config/systemd/user"
install -d -m 700 "$CFG" "$UNITS/eira-app.service.d"
[[ ! -e "$CFG/selma.env" && ! -e "$UNITS/eira-app.service.d/95-selma.conf" ]]
[[ ! -e "$UNITS/eira-selma.service" && ! -e "$UNITS/eira-selma-vistas.service" ]]
MB_ANTES=$("$SELMA_PYTHON" scripts/conexion-metabase-selma.py)
MB_NUEVA="$EIRA_ESTADO_DIR/metabase-selma.sqlite"
printf '%s\n' "$MB_ANTES" > "$CFG/metabase-antes"
printf '%s\n' "EIRA_ADAPTADOR=$EIRA_ADAPTADOR" "SELMA_PY=$SELMA_PY" \
  "SELMA_PYTHON=$SELMA_PYTHON" "EIRA_ESTADO_DIR=$EIRA_ESTADO_DIR" \
  "VALKEY_URL=redis://127.0.0.1:6379/4" > "$CFG/selma.env"
chmod 600 "$CFG/selma.env"        # inyectar VALKEY_PASSWORD aparte si la instancia lo requiere
install -m 644 scripts/eira-selma{,-vistas}.service "$UNITS/"
printf '[Service]\nWorkingDirectory=%s\n' "$FE_WEB" > "$UNITS/eira-app.service.d/95-selma.conf"
systemctl --user daemon-reload

# Cerrar ambos productores. No continuar hasta que ambos consumidores drenen.
systemctl --user stop eira-app eira-candidata-app
for db in 4 "$CANDIDATA"; do
  for stream in trabajos decisiones; do
    "$VK" -p 6379 -n "$db" --json XINFO GROUPS "eira:$stream" |
      jq -e 'any(.[]; .name=="procesadores" and .pending==0 and .lag==0)' >/dev/null
  done
done
systemctl --user stop eira-candidata-worker eira-candidata-vistas
VALKEY_URL="redis://127.0.0.1:6379/$CANDIDATA" "$SELMA_PYTHON" scripts/verificar-estado-selma.py
systemctl --user stop eira-motor
test "$("$VK" -p 6379 --raw SWAPDB 4 "$CANDIDATA")" = OK
export VALKEY_URL=redis://127.0.0.1:6379/4
"$SELMA_PYTHON" scripts/verificar-estado-selma.py
"$SELMA_PYTHON" -m db.exportar_selma
"$SELMA_PYTHON" scripts/conexion-metabase-selma.py --desde "$MB_ANTES" --hasta "$MB_NUEVA"
systemctl --user start eira-selma eira-selma-vistas eira-app
systemctl --user is-active eira-selma eira-selma-vistas eira-app
# APP_URL = app recién reiniciada; TABLERO_MB = tablero servido al público.
"$SELMA_PYTHON" scripts/cotejar-selma.py
```

Solo reabrir tráfico después del cotejo y de comprobar una carga, una decisión y su reflejo en el tablero. **Rollback antes de admitir escrituras**, solo si `SWAPDB` tuvo éxito y no se tocó la base reservada desde entonces:

```bash
systemctl --user stop eira-app eira-selma eira-selma-vistas
test "$("$VK" -p 6379 --raw SWAPDB 4 "$CANDIDATA")" = OK
MB_ANTES=$(cat "$CFG/metabase-antes")
ACTUAL=$("$SELMA_PYTHON" scripts/conexion-metabase-selma.py)
if [[ $ACTUAL == "$MB_NUEVA" ]]; then
  "$SELMA_PYTHON" scripts/conexion-metabase-selma.py --desde "$MB_NUEVA" --hasta "$MB_ANTES"
else
  test "$ACTUAL" = "$MB_ANTES"
fi
mv "$UNITS/eira-app.service.d/95-selma.conf" "$CFG/95-selma-rollback.conf"
systemctl --user daemon-reload
systemctl --user start eira-motor eira-app
```

Si ya se admitieron escrituras, no intercambiar a ciegas: guardar y reconciliar el delta. Si el primer intercambio nunca ocurrió, **no ejecutar un `SWAPDB` de rollback**. El corte real, respaldos, rollback en vivo, persistencia tras reinicio del host y autorización están **UNVERIFIED**. No se tocaron los servicios activos ni la base 4.

Tras aceptar el corte, si se desea mantenerlo al reiniciar la máquina, registrar primero la política anterior con `systemctl --user is-enabled eira-motor`; con aprobación, `systemctl --user disable eira-motor && systemctl --user enable eira-selma`. El worker solicita las vistas con `Wants=`. Si se revierte después, deshabilitar Selma y restaurar la política anterior.

<details>
<summary>Historial: comparación inicial de solo lectura antes de elegir procesador</summary>

> Análisis de solo lectura hecho por un agente el 21 nov, 14:20 CDMX, sobre `origin/soe_python` en `3435ded`. La rama siguió avanzando después (14:25: `13a806d`); lo posterior no está revisado. No se desplegó su código ni se cambió el nuestro: la decisión es de Ian.


Alcance: solo lectura sobre `origin/soe_python` (3435ded, 21 nov 14:13), exportado a un directorio temporal fuera del repositorio. No toqué el repositorio ni ningún servicio.

## 1. Verificado

| Qué | Comando | Resultado |
|---|---|---|
| Cambios de la rama | `git diff --stat origin/main...origin/soe_python \| tail` | `31 files changed, 2051 insertions(+), 84 deletions(-)`: `py/procesador/` (12 archivos), `py/datos_demo/`, `py/subir_demo.py`, `py/tests/test_flujo.py`, `test_texto.py`, y reescribe `py/tests/conftest.py` |
| Commits | `git log origin/soe_python --not origin/main` | 5 commits de sortegae (a07998d, 83b34b3, f44e70b, e8762e3, 3435ded) |
| Sus pruebas, tal cual | `uv run --no-project --with-requirements requirements.txt --with pytest python -m pytest tests/test_flujo.py tests/test_texto.py -q` | `4 passed, 3 skipped`: su fixture arranca un `valkey-server` propio y no hay ninguno en el PATH |
| Sus pruebas contra 6392 | mismo comando, tras cambiar en mi copia el fixture `v` a `port=6392, db=10` con `flushdb` | `7 passed in 4.54s`; la base 10 quedó en 0 claves |

No corrí `test_motor.py` (nuestro) dentro de su rama.

## 2. Streams y grupos (leído en código)

| | Motor (nuestro) | Procesador (Selma) |
|---|---|---|
| Streams | `eira:trabajos`, `eira:decisiones` | los mismos |
| Grupo | `procesadores` | `procesadores` (el mismo) |
| Consumidor | `py-<pid>` | `py-1` (`EIRA_CONSUMIDOR`) |
| Reintentos | reclama pendientes con `min_idle_time` y marca error tras varios intentos | relee solo sus pendientes al arrancar; no reclama los de otro consumidor |
| SQLite | `IMPACTO_DB` (`data/impacto.sqlite`, `db/esquema.sql`) | `py/.estado/eira.sqlite` (`EIRA_ESTADO_DIR`) |
| Escritura | incremental (`HINCRBY`, `SADD`) | borra y reescribe todo lo derivado en un `MULTI` por cada trabajo o decisión |

## 3. Clave por clave

| Clave | Contrato | Motor | Selma | Diferencia |
|---|---|---|---|---|
| `eira:trabajo:<id>` `estado` | procesando, listo, duplicado, error | igual | igual | ninguna |
| `mensaje`, `nivel_duplicado`, `fuente`, `fuente_original`, `filas*`, `mapeo`, `terminado_en` | sí | sí | sí | campos del motor uno a uno: SIN VERIFICAR |
| `eira:archivo:<id>` | lo escribe el frontend, 1 h | lo lee y lo borra al terminar | lo lee y no lo borra | el crudo con nombres queda hasta 1 h |
| `eira:fuentes`, `eira:fuente:<id>` | sí | sí | sí, con los campos del contrato | puntaje del zset: ella usa la hora de carga guardada |
| `eira:anom:*`, `eira:omitidas:*` | sí | sí | sí | sus `filas_omitidas` incluyen repetidas internas |
| `eira:per:todas`, `per:programa`, `per:ciudad`, `per:periodo`, `per:servicio` | todas las personas | incluye donantes | solo impactadas | cambia el significado |
| `eira:per:certeza:<nivel>` | sí | sí | sí | ninguna |
| `eira:per:impactadas:<prog>` | sí | sí | no | falta, y su borrado de `eira:per:*` elimina las nuestras |
| `eira:per:donantes:<prog>` | sí | sí | no; usa `eira:don:programa:<prog>` y `eira:don:todas` | nombre fuera de contrato |
| `eira:per:tipo:<tipo>` | no (propuesta del frontend) | no | no | el frontend cae a `per:programa` |
| `eira:nac`, `eira:sinid`, `eira:cnt:<unidad>`, `eira:valores:*` | sí | sí | sí | ella no escribe `valores:estado` |
| `eira:presencia:<alcance>` | sí | sí | no | falta |
| `eira:pares` | sí | sí, `HSETNX` | sí, misma forma JSON | ids de par e ids de persona distintos entre motores |
| `eira:huellas:archivo`, `huellas:fila` | sí | sí | no; las guarda en su SQLite | no ve duplicados de lo que cargó el motor |
| `eira:met:<prog>`, `eira:met:global` | no | no | sí | añadido suyo; el frontend no lo lee |
| `eira:bitacora`, `eira:eventos`, `eira:contrato` | sí | sí | sí | ella pone `contrato` sin `NX` |
| Decisiones `persona`, `restituir_fila` | sí | sí | sí | equivalentes |

## 4. Consumidores

| Lector | Lee | ¿Lo cubre Selma? |
|---|---|---|
| `web/lib/datos.ts`: trabajos, fuentes, anomalías, omitidas, pares, bitácora | claves comunes | Sí |
| `datos.ts`: filtros, conteos, edad (`valores`, `cnt`, `nac`, `sinid`, `perCerteza`) | comunes | Sí |
| `impactadasIdsDe` y `noImpactadasIdsDe` (vista previa del informe) | `per:tipo:*`, o si no `per:programa` | Parcial: impactadas correctas; las donantes saldrían en 0, porque están en `eira:don:*` (inferido) |
| `web/lib/territorio.ts` | `eira:presencia:<alcance>` | No: mapa vacío |
| Metabase (`metabase/provisionar.py`) | vistas `v_global`, `v_conteos`, `v_personas_por_programa`, `v_objetos`, `v_presencia`, `v_presencia_municipios`, `v_calidad`, `v_edad`, `v_cruce_programas`, `v_pares_pendientes` | No: su `eira.sqlite` tiene 4 tablas (`fuentes`, `filas`, `anomalias`, `pares`) y ninguna vista |

## 5. Conclusiones

**(a) Si corriera el suyo en lugar del nuestro**
- Se rompe: el mapa de presencia, las donantes en el informe y todo Metabase, que se queda sin datos nuevos.
- Se pierde: el borrado del archivo crudo y la reconstrucción desde `IMPACTO_DB`.
- Se gana: métricas precalculadas en `eira:met:*`, un catálogo que rechaza programa o tipo inválido con mensaje claro, lectura de CSV y datos de demostración con valores esperados.

**(b) Los dos a la vez en el mismo Valkey**
- Mismo grupo (situación actual del código): cada trabajo le toca a uno solo, al azar. Como ella borra `eira:per:*`, `eira:cnt:*`, `eira:fuente:*` y `eira:pares` en cada proyección, eliminaría lo escrito por el motor. Su README lo advierte ("un solo trabajador a la vez").
- Grupos distintos: ambos procesan cada trabajo y cada decisión, con doble escritura, dos ids de fuente y de persona, y el mismo borrado.
- No deben compartir base de Valkey.

**(c) Caminos, de menor a mayor esfuerzo**

| Opción | Minutos | Riesgo |
|---|---|---|
| 1. Mantener el motor en la demo y documentar el suyo (esta tabla) | 10 | Ninguno técnico |
| 2. Correr el suyo en otra base de Valkey con `EIRA_ESTADO_DIR` propio y comparar cifras con `subir_demo.py` | 30 a 45 | Bajo. Ojo: la fusión de la rama reescribe `py/tests/conftest.py` y puede romper `test_motor.py` (inferido) |
| 3. Adaptar nombres: que ella escriba `per:donantes`, `per:impactadas`, `presencia` y `huellas`, o portar al motor su `eira:met:*` y su catálogo | 90 a 180 | Alto antes de la demo; Metabase sigue sin cubrirse en la primera dirección |

**(d) Preguntas abiertas**
- Selma: ¿`eira:per:todas` debe excluir donantes? Eso cambia el contrato.
- Selma: ¿aceptaría `eira:per:donantes:<prog>` en vez de `eira:don:*`?
- Selma: ¿quién iba a leer `eira:met:*`?
- Selma: ¿piensa escribir presencia?
- Ian: ¿el total Global es la suma por programa (su regla y la de la vista previa) o personas únicas?
- Ian: ¿Metabase es parte obligatoria de la demo?
- Ian: ¿se fusiona `soe_python` a `main` antes o después de la demo?

SIN VERIFICAR: comportamiento real del frontend con sus datos (no levanté nada), campos de `eira:trabajo` del motor uno a uno, y el efecto de la fusión sobre nuestras pruebas.

</details>
