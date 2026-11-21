#!/usr/bin/env bash
# humo_motor.sh — prueba de humo del motor (rama motor) de punta a punta:
# Valkey de prueba (base 8), SQLite temporal, y los reportes de reportes/
# procesados en el orden de la Tarea 3 del plan (verificación final).
#
# Uso: scripts/humo_motor.sh [--desde <rama>]
#   --desde <rama>  materializa py/ db/ reportes/ scripts/ pyproject.toml uv.lock
#                   de origin/<rama> en .demo/humo-motor/src y corre ahí (para
#                   probar antes de que las ramas se integren).
#
# Anulaciones: HUMO_VALKEY_URL (def. redis://127.0.0.1:6379/8), HUMO_DB,
#              HUMO_DIR (por defecto .demo/humo-motor).
#
# Dependencias esperadas (rama motor): scripts/procesar_local.py y, si el
# procesado es asíncrono, scripts/arrancar-motor.sh. Si faltan, el script lo dice
# y sale con código 2.
set -uo pipefail
cd "$(dirname "$0")/.."

DESDE=""
[ "${1:-}" = "--desde" ] && DESDE="${2:-motor}"
HUMO_DIR="${HUMO_DIR:-$PWD/.demo/humo-motor}"
SRC="$PWD"
if [ -n "$DESDE" ]; then
  SRC="$HUMO_DIR/src"
  mkdir -p "$SRC"
  if ! git rev-parse --verify "origin/$DESDE" >/dev/null 2>&1; then
    echo "No existe origin/$DESDE" >&2; exit 2
  fi
  git archive "origin/$DESDE" | tar -x -C "$SRC"
  echo "Materializado origin/$DESDE en $SRC"
fi
cd "$SRC"

VALKEY_URL="${HUMO_VALKEY_URL:-redis://127.0.0.1:6379/8}"
IMPACTO_DB="${HUMO_DB:-$HUMO_DIR/impacto.sqlite}"
IMPACTO_HMAC_KEY="${HUMO_HMAC_KEY:-humo-motor}"
export VALKEY_URL IMPACTO_DB IMPACTO_HMAC_KEY
mkdir -p "$HUMO_DIR"

if [ ! -f scripts/procesar_local.py ] && [ ! -f py/motor/worker.py ]; then
  cat >&2 <<EOF
La rama aún no trae el motor (faltan scripts/procesar_local.py y py/motor/worker.py).
Este script está listo; en cuanto origin/motor (o la integración) los traiga:
  scripts/humo_motor.sh --desde motor
EOF
  exit 2
fi

pyv() { # Python con el paquete valkey disponible
  uv run --with valkey python "$@"
}

# Limpia SOLO las claves eira:* de la base de prueba. Jamás FLUSHALL.
echo "Limpiando eira:* en $VALKEY_URL"
pyv - <<'PY'
import os, valkey
v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], decode_responses=False)
n = 0; cur = 0
while True:
    cur, ks = v.scan(cur, match=b"eira:*", count=500)
    if ks: v.delete(*ks); n += len(ks)
    if cur == 0: break
print(f"  {n} claves borradas")
PY

rm -f "$IMPACTO_DB"
if [ -f db/crear.py ]; then
  if [ -f pyproject.toml ] && command -v uv >/dev/null; then UV="uv run"; else UV=""; fi
  IMPACTO_DB="$IMPACTO_DB" $UV python -m db.crear
fi

WPID=""
if [ -x scripts/arrancar-motor.sh ]; then
  echo "Arrancando el motor (scripts/arrancar-motor.sh)"
  setsid nohup scripts/arrancar-motor.sh >"$HUMO_DIR/motor.log" 2>&1 &
  WPID=$!
  trap '[ -n "$WPID" ] && kill "$WPID" 2>/dev/null' EXIT
  sleep 2
fi

FALLOS=0
printf '%-38s %-24s %-24s %s\n' "archivo" "estado esperado/obtenido" "nivel esperado/obtenido" "resultado"

estado_de() { # nombre de archivo → "estado|nivel|filas_nuevas|filas_omitidas" del trabajo más reciente
  pyv - "$1" <<'PY'
import os, sys, time, valkey
v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], decode_responses=True)
nombre = sys.argv[1]
for _ in range(60):
    mejor = None
    cur = 0
    while True:
        cur, ks = v.scan(cur, match="eira:trabajo:*", count=200)
        for k in ks:
            h = v.hgetall(k)
            if h.get("nombre") == nombre and (not mejor or h.get("creado_en", "") >= mejor.get("creado_en", "")):
                mejor = h
        if cur == 0: break
    if mejor and mejor.get("estado") in ("listo", "duplicado", "error"):
        print("|".join(str(mejor.get(f, "")) for f in ("estado", "nivel_duplicado", "filas_nuevas", "filas_omitidas")))
        sys.exit(0)
    time.sleep(1)
print("||"); sys.exit(0)
PY
}

procesa() { # archivo | estado esperado | nivel esperado
  local f="$1" e_est="$2" e_niv="$3" out est niv fn fo r
  if [ -f scripts/procesar_local.py ]; then
    if [ -f pyproject.toml ] && command -v uv >/dev/null; then UV="uv run"; else UV=""; fi
    case "$f" in
      salud-que-florece.xlsx) prog="salud-que-florece"; unidad="participacion" ;;
      nutricion.xlsx) prog="nutricion"; unidad="atencion" ;;
      *) prog="tamizaje-rosa"; unidad="atencion" ;;
    esac
    out="$($UV python scripts/procesar_local.py "reportes/$f" --programa "$prog" --unidad "$unidad" --por humo 2>&1)" || echo "$out" >&2
  fi
  IFS='|' read -r est niv fn fo <<<"$(estado_de "$f")"
  r="OK"
  [ "$est" = "$e_est" ] || r="FALLA"
  [ -n "$e_niv" ] && [ "$niv" != "$e_niv" ] && r="FALLA"
  [ "$r" = "OK" ] || FALLOS=$((FALLOS+1))
  printf '%-38s %-24s %-24s %s\n' "$f" "$e_est/$est" "${e_niv:--}/$niv" "$r"
  # Devuelve campos extra para comprobaciones puntuales.
  ULT_FN="$fn"; ULT_FO="$fo"
}

# Orden de la Tarea 3 del plan (verificación final).
procesa tamizaje-rosa.xlsx            listo     ""
procesa reporte_final_2.xlsx          duplicado identico
procesa tamizaje-rosa-reguardado.xlsx duplicado mismo_contenido
procesa tamizaje-rosa.csv             duplicado mismo_contenido
procesa tamizaje-rosa_v2.xlsx         listo     version_nueva
[ "${ULT_FN:-}" = "8" ] || { echo "  filas_nuevas de tamizaje-rosa_v2.xlsx: ${ULT_FN:-?} (esperado 8) FALLA"; FALLOS=$((FALLOS+1)); }
procesa salud-que-florece.xlsx        listo     ""
procesa nutricion.xlsx                listo     traslape_parcial
[ "${ULT_FO:-}" = "30" ] || { echo "  filas_omitidas de nutricion.xlsx: ${ULT_FO:-?} (esperado 30) FALLA"; FALLOS=$((FALLOS+1)); }

echo
echo "Totales en SQLite contra reportes/esperado.json:"
IMPACTO_DB="$IMPACTO_DB" python3 - <<'PY'
import json, os, sqlite3
fallos = []
esp = {}
p = "reportes/esperado.json"
if os.path.exists(p):
    esp = json.load(open(p))
con = sqlite3.connect(os.environ["IMPACTO_DB"])
def q(sql, *a):
    return con.execute(sql, a).fetchone()[0]
def checa(nombre, real, esperado):
    tag = "OK" if real == esperado else "FALLA"
    if real != esperado: fallos.append(nombre)
    print(f"  {nombre}: {real} (esperado {esperado}) {tag}")

checa("atenciones contadas (120+8)", int(q("select coalesce(sum(cantidad),0) from registros where unidad='atencion' and contado=1")), 128)
checa("participaciones contadas", int(q("select coalesce(sum(cantidad),0) from registros where unidad='participacion' and contado=1")), 80)
checa("fuentes importadas", int(q("select count(*) from fuentes")), 4)
g = esp.get("globales", esp) if esp else {}
if "personas_identificadas" in g:
    checa("personas identificadas", int(q("select count(*) from personas")), g["personas_identificadas"])
if "registros_sin_identificar" in g:
    checa("registros sin identificar", int(q("select count(*) from registros where persona_id is null and contado=1")), g["registros_sin_identificar"])
if "pares_mismo_id" in g:
    checa("pares pendientes", int(q("select count(*) from pares_persona where estado='pendiente'")), g["pares_mismo_id"])
if "edad_promedio" in g:
    v = q("select round(avg(cast((julianday('now')-julianday(fecha_nacimiento))/365.25 as int)),1) from personas where fecha_nacimiento is not null")
    print(f"  edad promedio: {v} (esperado {g['edad_promedio']}) informativo")
con.close()
raise SystemExit(1 if fallos else 0)
PY
FALLOS=$((FALLOS + $?))

echo
if [ "$FALLOS" -eq 0 ]; then echo "humo del motor: todo en orden"; else echo "humo del motor: $FALLOS comprobación(es) fallaron"; fi
exit "$FALLOS"
