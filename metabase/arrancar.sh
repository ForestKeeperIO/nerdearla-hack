#!/usr/bin/env bash
# Arranca Metabase de código abierto (JAR en .metabase/, ignorado por git).
#
# Variables:
#   METABASE_PORT   Puerto HTTP (por defecto 3200)
#   METABASE_DIR    Directorio de datos del JAR y de la base interna (por defecto .metabase/)
#   METABASE_VERSION Versión del JAR a descargar si no existe (por defecto 0.65.6)
#
# Detener:   pkill -f '.metabase/metabase.jar'
# Reiniciar: pkill -f '.metabase/metabase.jar'; bash metabase/arrancar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

METABASE_PORT="${METABASE_PORT:-3200}"
METABASE_DIR="${METABASE_DIR:-.metabase}"
METABASE_VERSION="${METABASE_VERSION:-0.65.6}"
JAR="$METABASE_DIR/metabase.jar"
mkdir -p "$METABASE_DIR"

if [ ! -f "$JAR" ]; then
  echo "Descargando Metabase OSS v$METABASE_VERSION..."
  curl -fSL -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" \
    -o "$JAR" "https://downloads.metabase.com/v$METABASE_VERSION.x/metabase.jar"
fi

if curl -sf "http://127.0.0.1:$METABASE_PORT/api/health" >/dev/null 2>&1; then
  echo "Metabase ya corre en http://127.0.0.1:$METABASE_PORT"
  exit 0
fi

# La base interna (H2) queda dentro de METABASE_DIR: metabase.db.mv.db
setsid nohup env \
  MB_JETTY_PORT="$METABASE_PORT" \
  MB_DB_FILE="$PWD/$METABASE_DIR/metabase" \
  java -jar "$JAR" > "$METABASE_DIR/metabase.log" 2>&1 < /dev/null &

echo "Metabase arrancando en http://127.0.0.1:$METABASE_PORT (bitácora: $METABASE_DIR/metabase.log)"
echo "Esperando a /api/health..."
for i in $(seq 1 180); do
  if curl -sf "http://127.0.0.1:$METABASE_PORT/api/health" >/dev/null 2>&1; then
    echo "Metabase listo en http://127.0.0.1:$METABASE_PORT"
    exit 0
  fi
  sleep 2
done
echo "Metabase no respondió en 6 minutos; revisa $METABASE_DIR/metabase.log" >&2
exit 1
