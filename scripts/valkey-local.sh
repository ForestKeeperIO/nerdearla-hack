#!/usr/bin/env bash
# Descarga (una vez) y arranca Valkey sin Docker, para desarrollo y pruebas.
set -euo pipefail
VER=9.2.0
NAME="valkey-${VER}-noble-x86_64"
URL="https://download.valkey.io/releases/${NAME}.tar.gz"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.valkey"
PORT="${VALKEY_PORT:-6379}"
mkdir -p "$DIR/data"
if [ ! -x "$DIR/$NAME/bin/valkey-server" ]; then
  curl -sfL -o "$DIR/v.tgz" "$URL"
  curl -sfL -o "$DIR/v.sha" "$URL.sha256"
  [ "$(sha256sum "$DIR/v.tgz" | cut -d' ' -f1)" = "$(cut -d' ' -f1 "$DIR/v.sha")" ] || { echo "suma de verificación incorrecta" >&2; exit 1; }
  tar xzf "$DIR/v.tgz" -C "$DIR"
fi
CLI=("$DIR/$NAME/bin/valkey-cli" -p "$PORT")
ARGS=(--port "$PORT" --bind 127.0.0.1 --appendonly yes --dir "$DIR/data" --daemonize yes --logfile "$DIR/valkey.log")
if [ -n "${VALKEY_PASSWORD:-}" ]; then
  ARGS+=(--requirepass "$VALKEY_PASSWORD")
  CLI+=(-a "$VALKEY_PASSWORD" --no-auth-warning)
fi
if "${CLI[@]}" ping >/dev/null 2>&1; then
  echo "Valkey ya está corriendo en el puerto $PORT"; exit 0
fi
"$DIR/$NAME/bin/valkey-server" "${ARGS[@]}"
sleep 1
"${CLI[@]}" ping
