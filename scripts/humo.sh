#!/usr/bin/env bash
# humo.sh — prueba de humo de un frontend del demo EIRA ya en marcha.
#
# Uso: scripts/humo.sh <url-base> [--vacio]
#   <url-base>  p. ej. http://127.0.0.1:3100 o la dirección *.trycloudflare.com
#   --vacio     además exige el estado en blanco: portada con los tres informes
#               "Sin empezar" y los pasos bloqueados redirigiendo.
#
# Rutas públicas esperadas (versión del recorrido guiado, rama fe):
#   /                                          200; con --vacio nombra los 3 informes "Sin empezar"
#   /informe/<alcance>/subir                   200 (primer paso siempre abierto; alcance de programa)
#   /informe/<alcance>/calidad|vista-previa|exportar   3xx cuando está bloqueado, 200 si ya se puede
#   /informe/global/subir                      no existe: se acepta 3xx o 404, nunca 5xx
#   /api/salud                                 200 con {"ok":true}
#
# Sale con código distinto de cero si algo falla e imprime una tabla.
set -uo pipefail

BASE="${1:-}"; VACIO=0
[ "${2:-}" = "--vacio" ] && VACIO=1
if [ -z "$BASE" ]; then echo "uso: $0 <url-base> [--vacio]" >&2; exit 2; fi
BASE="${BASE%/}"

codigo() { curl -s -o /dev/null -m 10 -w '%{http_code}' "$BASE$1"; }
cuerpo() { curl -s -m 10 "$BASE$1"; }

FALLOS=0
printf '%-42s %-10s %-10s %s\n' "ruta" "esperado" "obtenido" "resultado"

# ruta | qué se acepta (200 | 3xx | 200o3xx | 3xxo404)
checa() {
  local ruta="$1" espera="$2" c ok="no" obs=""
  c="$(codigo "$ruta")"
  case "$espera" in
    200)     [ "$c" = "200" ] && ok="sí" ;;
    3xx)     case "$c" in 3??) ok="sí" ;; esac ;;
    200o3xx) case "$c" in 200|3??) ok="sí" ;; esac ;;
    3xxo404) case "$c" in 3??|404) ok="sí" ;; esac ;;
  esac

  [ "$ok" = "sí" ] || FALLOS=$((FALLOS+1))
  printf '%-42s %-10s %-10s %s\n' "$ruta" "$espera" "$c" "$([ "$ok" = "sí" ] && echo OK || echo "FALLA $obs")"
}

checa "/"                                  200
checa "/api/salud"                         200
checa "/informe/tamizaje-rosa/subir"       200o3xx
checa "/informe/salud-que-florece/subir"   200o3xx
checa "/informe/global/subir"              3xxo404
for a in tamizaje-rosa salud-que-florece global; do
  for p in calidad vista-previa exportar; do
    if [ "$VACIO" = "1" ]; then
      checa "/informe/$a/$p" 3xx
    else
      checa "/informe/$a/$p" 200o3xx
    fi
  done
done

# Contenido: salud y, si --vacio, portada con los tres informes sin empezar.
s="$(cuerpo /api/salud)"
if echo "$s" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then r="OK"; else r="FALLA ($s)"; FALLOS=$((FALLOS+1)); fi
printf '%-42s %-10s %-10s %s\n' "/api/salud cuerpo" "ok:true" "-" "$r"

if [ "$VACIO" = "1" ]; then
  p="$(cuerpo /)"
  for t in "Tamizaje Rosa" "Salud que Florece" "Global" "Sin empezar"; do
    if echo "$p" | grep -qi "$t"; then r="OK"; else r="FALLA"; FALLOS=$((FALLOS+1)); fi
    printf '%-42s %-10s %-10s %s\n' "portada contiene «$t»" "sí" "-" "$r"
  done
fi

echo
if [ "$FALLOS" -eq 0 ]; then echo "humo: todo en orden en $BASE"; else echo "humo: $FALLOS comprobación(es) fallaron en $BASE"; fi
exit "$FALLOS"
