#!/usr/bin/env bash
# Devuelve el demo en vivo (procesador de Selma) a una base limpia guardada:
# Valkey (solo claves eira:*), el directorio de estado de Selma (SQLite, llave y
# proyección para Metabase) y la conexión de Metabase a esa proyección.
#
# Uso:
#   scripts/reiniciar-demo-selma.sh             restaura la base limpia (por defecto)
#   scripts/reiniciar-demo-selma.sh guardar     guarda el estado actual como base limpia
#
# Nunca borra: antes de restaurar mueve el estado actual a <estado>-respaldo-<hora>
# y deja ahí también las claves de Valkey (valkey.pickle).
#
# Variables (sin valor, se leen de EIRA_SELMA_ENV y, si faltan, del valor por defecto):
#   EIRA_SELMA_ENV    archivo de entorno de los servicios   (~/.config/eira/selma.env)
#   VALKEY_URL        base de Valkey del demo               (redis://127.0.0.1:6379/4)
#   EIRA_ESTADO_DIR   estado privado de Selma               (/var/tmp/eira-selma-estado)
#   SELMA_PYTHON      Python con el paquete valkey          (el del release de Selma)
#   BASE_SELMA        dónde vive la base limpia             (~/projects/.demo-eira/base-selma)
#   UNIDADES          servicios systemd --user, el procesador primero
#                                                           ("eira-selma eira-selma-vistas")
#   METABASE_URL      vacío para no tocar Metabase          (http://127.0.0.1:3200)
#   METABASE_DB, METABASE_CRED, METABASE_PUBLICO            (3, credenciales locales, tablero público)
set -euo pipefail
umask 077

modo=${1:-restaurar}
[[ $modo == restaurar || $modo == guardar ]] || { echo "Uso: $0 [restaurar|guardar]" >&2; exit 2; }

ENV_FILE=${EIRA_SELMA_ENV-$HOME/.config/eira/selma.env}
if [[ -n $ENV_FILE && -r $ENV_FILE ]]; then
  while IFS='=' read -r k val; do
    if [[ $k =~ ^(SELMA_PYTHON|EIRA_ESTADO_DIR|VALKEY_URL|VALKEY_PASSWORD)$ && -z ${!k:-} ]]; then
      export "$k=$val"
    fi
  done < "$ENV_FILE"
fi
export VALKEY_URL=${VALKEY_URL:-redis://127.0.0.1:6379/4}
E=${EIRA_ESTADO_DIR:-/var/tmp/eira-selma-estado}; E=${E%/}
P=${SELMA_PYTHON:-$HOME/.local/share/eira/releases/selma-13a806d/venv/bin/python}
B=${BASE_SELMA:-$HOME/projects/.demo-eira/base-selma}; B=${B%/}
read -r -a U <<< "${UNIDADES:-eira-selma eira-selma-vistas}"
MB=${METABASE_URL-http://127.0.0.1:3200}
TS=$(date +%Y%m%d-%H%M%S)

[[ $E = /* && $B = /* ]] || { echo 'EIRA_ESTADO_DIR y BASE_SELMA deben ser rutas absolutas.' >&2; exit 1; }
[[ -x $P ]] || { echo "No encuentro SELMA_PYTHON: $P" >&2; exit 1; }

# Vuelca o restaura las claves eira:* de la base de Valkey indicada en VALKEY_URL.
valkey_py() {
  "$P" -I - "$@" <<'PY'
import os, pickle, sys, valkey
v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], password=os.getenv("VALKEY_PASSWORD") or None,
                           socket_timeout=15)
def volcar(ruta):
    datos = {}
    for k in v.scan_iter("eira:*", count=1000):
        d = v.dump(k)
        if d is not None:
            datos[k] = (d, v.pttl(k))
    with open(ruta, "wb") as f:
        pickle.dump(datos, f)
    return datos
accion = sys.argv[1]
if accion == "guardar":
    print(f"Valkey: {len(volcar(sys.argv[2]))} claves guardadas en la base")
else:
    actuales = volcar(sys.argv[3])
    with open(sys.argv[2], "rb") as f:
        base = pickle.load(f)
    p = v.pipeline(transaction=True)
    for k in actuales:
        p.delete(k)
    for k, (dump, pttl) in base.items():
        p.restore(k, pttl if pttl > 0 else 0, dump, replace=True)
    p.execute()
    print(f"Valkey: {len(actuales)} claves respaldadas, {len(base)} restauradas")
PY
}

cifras() {
  "$P" -I - <<'PY'
import os, valkey
v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], password=os.getenv("VALKEY_PASSWORD") or None,
                           decode_responses=True, socket_timeout=15)
g = v.hgetall("eira:met:global")
print("Cifras: personas={} donantes={} municipios={} fuentes={} sin_identificar={}".format(
    *(g.get(k, "-") for k in ("personas", "donantes", "municipios", "fuentes", "sin_identificar"))))
for k in sorted(v.scan_iter("eira:trabajo:*", count=1000)):
    t = v.hgetall(k)
    print(f"  {t.get('nombre')}: {t.get('estado')} ({t.get('nivel_duplicado')}, {t.get('filas_nuevas')} filas nuevas)")
PY
}

parar() { for ((i=${#U[@]}-1; i>=0; i--)); do systemctl --user stop "${U[i]}"; done; }
arrancar() {
  systemctl --user start "${U[0]}"; sleep 2
  for u in "${U[@]:1}"; do systemctl --user start "$u"; done
  sleep 3
  for u in "${U[@]}"; do
    systemctl --user is-active --quiet "$u" || { echo "El servicio $u no quedó activo:" >&2
      journalctl --user -u "$u" -n 20 --no-pager >&2; exit 1; }
  done
  echo "Servicios activos: ${U[*]}"
}

if [[ $modo == guardar ]]; then
  [[ -f $E/hmac.key && -f $E/eira.sqlite ]] || { echo "No hay estado de Selma en $E" >&2; exit 1; }
  parar
  trap arrancar EXIT
  N=$B.nueva-$TS
  install -d -m 700 "$N" "$N/estado"
  cp -a "$E/." "$N/estado/"
  rm -f "$N/estado/worker.lock"
  valkey_py guardar "$N/valkey.pickle"
  [[ -e $B ]] && mv "$B" "$B.anterior-$TS"
  mv "$N" "$B"
  echo "Base limpia guardada en $B"
  cifras
  exit 0
fi

[[ -f $B/valkey.pickle && -f $B/estado/hmac.key && -f $B/estado/eira.sqlite ]] || {
  echo "No hay base limpia en $B. Créala con: $0 guardar" >&2; exit 1; }

parar
R=$E-respaldo-$TS
if [[ -d $E ]]; then mv "$E" "$R"; else install -d -m 700 "$R"; fi
install -d -m 700 "$E"
cp -a "$B/estado/." "$E/"
chmod 700 "$E"; chmod 600 "$E/hmac.key"
valkey_py restaurar "$B/valkey.pickle" "$R/valkey.pickle"
arrancar

if [[ -n $MB ]]; then
  METABASE_URL=$MB METABASE_DB=${METABASE_DB:-3} EIRA_ESTADO_DIR=$E \
  METABASE_CRED=${METABASE_CRED:-$HOME/projects/nerdearla-hack-metabase/.metabase/credenciales.json} \
  METABASE_PUBLICO=${METABASE_PUBLICO:-886327d0-b72a-4442-84bf-f1e55eaf9255} \
  python3 -I - <<'PY' || echo "Aviso: no se pudo reconectar Metabase; revisa el tablero a mano." >&2
# Metabase guarda abierto el SQLite anterior: se cambia la ruta y se vuelve a poner
# para forzar una conexión nueva al archivo restaurado.
import json, os, urllib.request
B, db = os.environ["METABASE_URL"].rstrip("/"), os.environ["METABASE_DB"]
def call(path, data=None, tok=None, method=None):
    r = urllib.request.Request(B + path, data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json", **({"X-Metabase-Session": tok} if tok else {})}, method=method)
    raw = urllib.request.urlopen(r, timeout=60).read()
    return json.loads(raw) if raw else {}
c = json.load(open(os.environ["METABASE_CRED"]))
tok = call("/api/session", {"username": c["email"], "password": c["password"]})["id"]
d = call(f"/api/database/{db}", tok=tok)
estado = os.environ["EIRA_ESTADO_DIR"]
for ruta in (f"{estado}/./metabase-selma.sqlite", f"{estado}/metabase-selma.sqlite"):
    call(f"/api/database/{db}", {"name": d["name"], "engine": d["engine"], "details": {**d["details"], "db": ruta}}, tok, "PUT")
call(f"/api/database/{db}/sync_schema", {}, tok, "POST")
pub = os.environ["METABASE_PUBLICO"]
for x in call(f"/api/public/dashboard/{pub}")["dashcards"]:
    n = (x.get("card") or {}).get("name")
    if n in ("Personas impactadas", "Donantes de cabello"):
        filas = call(f"/api/public/dashboard/{pub}/dashcard/{x['id']}/card/{x['card']['id']}?parameters=%5B%5D")
        print(f"Metabase: {n} = {filas['data']['rows'][0][0]}")
PY
fi

cifras
echo "Estado anterior respaldado en $R"
