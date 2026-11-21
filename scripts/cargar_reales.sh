#!/usr/bin/env bash
# cargar_reales.sh — llena el entorno "real" con los reportes de datos públicos
# (rama fuentes-reales, reportes-reales/) pasándolos por el motor.
#
# Uso: scripts/cargar_reales.sh
#   Anulaciones para ensayar en otra base: CARGA_VALKEY_URL, CARGA_DB,
#   CARGA_HMAC_KEY, CARGA_DIR (dónde están los CSV; por defecto reportes-reales/).
#
# Mapeo archivo → programa y unidad (decisión del demo; contrato permite cuatro
# unidades: atencion, estudio, participacion, entrega_insumo). Los datos públicos
# no traen identificador de persona: se cargan como contexto, no como registros
# de un programa de EIRA. Ver reportes-reales/README.md para la procedencia.
#
#   archivo                                                 programa           unidad
#   defunciones_mujeres_jalisco_c50_c53_2024.csv            contexto-publico   estudio
#   defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv    contexto-publico   estudio
#   egresos_hospitalarios_jalisco_c50_c53_2024.csv          contexto-publico   atencion
#   clues_unidades_salud_jalisco_2026.csv                   contexto-publico   estudio
#
# Al terminar comprueba contra reportes-reales/esperado.json: filas por archivo
# (las del CSV y las que quedaron en SQLite con contado=1) y totales de control
# recalculados del propio CSV.
set -euo pipefail
cd "$(dirname "$0")/.."

VALKEY_URL="${CARGA_VALKEY_URL:-redis://127.0.0.1:6379/1}"
IMPACTO_DB="${CARGA_DB:-$PWD/data/real.sqlite}"
IMPACTO_HMAC_KEY="${CARGA_HMAC_KEY:-$(cat .demo/clave 2>/dev/null || echo demo-local)}"
DIR="${CARGA_DIR:-reportes-reales}"
export VALKEY_URL IMPACTO_DB IMPACTO_HMAC_KEY

FECHA_CORTE="${CARGA_FECHA_CORTE:-2026-11-21}"
POR="${CARGA_POR:-demo}"

# nombre|programa|unidad
MAPEO='defunciones_mujeres_jalisco_c50_c53_2024.csv|contexto-publico|estudio
defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv|contexto-publico|estudio
egresos_hospitalarios_jalisco_c50_c53_2024.csv|contexto-publico|atencion
clues_unidades_salud_jalisco_2026.csv|contexto-publico|estudio'

py() { if [ -f pyproject.toml ] && command -v uv >/dev/null; then uv run "$@"; else shift; python3 "$@"; fi; }

if [ ! -f scripts/procesar_local.py ]; then
  echo "Falta scripts/procesar_local.py (rama motor). Cuando esté, este script funciona tal cual." >&2
  exit 2
fi

procesar() { # archivo programa unidad — la interfaz de procesar_local.py
  py python scripts/procesar_local.py "$DIR/$1" \
    --programa "$2" --unidad "$3" --fecha-corte "$FECHA_CORTE" --por "$POR"
}

echo "Cargando reportes reales → $VALKEY_URL · $IMPACTO_DB"
echo "$MAPEO" | while IFS='|' read -r f prog unidad; do
  [ -f "$DIR/$f" ] || { echo "  FALTA $DIR/$f" >&2; continue; }
  echo "  → $f ($prog / $unidad)"
  procesar "$f" "$prog" "$unidad"
done

echo
echo "Verificando contra $DIR/esperado.json…"
CARGA_DIR="$DIR" IMPACTO_DB="$IMPACTO_DB" python3 - <<'PY'
import csv, json, os, sqlite3, sys

d = os.environ["CARGA_DIR"]
esp = json.load(open(os.path.join(d, "esperado.json")))
fallos = []

def filas_csv(nombre):
    with open(os.path.join(d, nombre), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

conteos = {}
for nombre, e in esp.items():
    filas = filas_csv(nombre)
    n = len(filas)
    tag = "OK" if n == e["filas"] else "FALLA"
    if n != e["filas"]:
        fallos.append(nombre)
    print(f"  {nombre}: {n} filas (esperado {e['filas']}) {tag}")
    conteos[nombre] = n
    # Totales de control que se pueden recalcular del CSV.
    tc = e.get("totales_control", {})
    if "defunciones_c50" in tc:
        c50 = sum(1 for r in filas if r.get("causa_grupo") == "C50")
        c53 = sum(1 for r in filas if r.get("causa_grupo") == "C53")
        mun = len({r.get("cvegeo_resid") for r in filas})
        for k, v, real in (("defunciones_c50", c50, tc["defunciones_c50"]),
                            ("defunciones_c53", c53, tc["defunciones_c53"]),
                            ("municipios_distintos", mun, tc["municipios_distintos"])):
            ok = v == real
            if not ok: fallos.append(f"{nombre}:{k}")
            print(f"    {k}: {v} (esperado {real}) {'OK' if ok else 'FALLA'}")
    if "suma_c50" in tc:
        s50 = sum(int(r["defunciones_mujeres"]) for r in filas if r.get("causa_grupo") == "C50")
        s53 = sum(int(r["defunciones_mujeres"]) for r in filas if r.get("causa_grupo") == "C53")
        meses = len({r.get("mes_ocur") for r in filas})
        for k, v, real in (("suma_c50", s50, tc["suma_c50"]),
                            ("suma_c53", s53, tc["suma_c53"]),
                            ("meses_con_datos", meses, tc["meses_con_datos"])):
            ok = v == real
            if not ok: fallos.append(f"{nombre}:{k}")
            print(f"    {k}: {v} (esperado {real}) {'OK' if ok else 'FALLA'}")
    if "egresos_c50" in tc:
        c50 = sum(1 for r in filas if r.get("causa_grupo") == "C50")
        c53 = sum(1 for r in filas if r.get("causa_grupo") == "C53")
        m = sum(1 for r in filas if r.get("sexo") == "2")
        u = len({r.get("clues") for r in filas})
        for k, v, real in (("egresos_c50", c50, tc["egresos_c50"]),
                            ("egresos_c53", c53, tc["egresos_c53"]),
                            ("egresos_mujeres_sexo2", m, tc["egresos_mujeres_sexo2"]),
                            ("unidades_clues_distintas", u, tc["unidades_clues_distintas"])):
            ok = v == real
            if not ok: fallos.append(f"{nombre}:{k}")
            print(f"    {k}: {v} (esperado {real}) {'OK' if ok else 'FALLA'}")
    if "instituciones_distintas" in tc:
        inst = len({r.get("institucion") for r in filas})
        mun = len({r.get("cvegeo") for r in filas})
        hosp = sum(1 for r in filas if "HOSPITAL" in (r.get("tipologia") or "").upper()
                   or "HOSPITAL" in (r.get("tipo_establecimiento") or "").upper())
        for k, v, real in (("instituciones_distintas", inst, tc["instituciones_distintas"]),
                            ("municipios_distintos", mun, tc["municipios_distintos"])):
            ok = v == real
            if not ok: fallos.append(f"{nombre}:{k}")
            print(f"    {k}: {v} (esperado {real}) {'OK' if ok else 'FALLA'}")
        print(f"    unidades_hospitalarias (aprox. por tipología): {hosp} (esperado {tc['unidades_hospitalarias']}) — informativo")

# Lo que quedó en SQLite (base de reporte).
db = os.environ["IMPACTO_DB"]
if os.path.exists(db):
    con = sqlite3.connect(db)
    try:
        for nombre, e in esp.items():
            row = con.execute(
                "select coalesce(sum(cantidad),0) from registros r join fuentes f"
                " on f.id=r.fuente_id where f.nombre=? and r.contado=1", (nombre,)).fetchone()
            v = int(row[0]) if row and row[0] is not None else 0
            ok = v == e["filas"]
            if not ok: fallos.append(f"sqlite:{nombre}")
            print(f"  SQLite {nombre}: {v} registros contados (esperado {e['filas']}) {'OK' if ok else 'FALLA'}")
    except sqlite3.OperationalError as ex:
        print(f"  SQLite: no se pudieron leer registros ({ex}); el motor aún no escribió")
        fallos.append("sqlite:esquema")
    con.close()
else:
    print(f"  SQLite {db} no existe todavía: verificación de base pendiente")
    fallos.append("sqlite:archivo")

sys.exit(1 if fallos else 0)
PY
