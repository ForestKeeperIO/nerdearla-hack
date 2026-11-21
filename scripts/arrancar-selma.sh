#!/usr/bin/env bash
# SELMA_PY apunta a py/ del release exportado, no a un checkout de trabajo.
set -euo pipefail
umask 077
: "${SELMA_PY:?Falta el directorio del release de Selma}"
: "${EIRA_ESTADO_DIR:?Falta el directorio privado del estado}"
: "${VALKEY_URL:?Falta la URL de Valkey con su base}"
: "${SELMA_PYTHON:?Falta el ejecutable de Python con los requisitos de Selma}"
[[ $EIRA_ESTADO_DIR = /* && -x $SELMA_PYTHON && -f $SELMA_PY/procesador/worker.py ]]
mkdir -p -- "$EIRA_ESTADO_DIR"
if git -C "$EIRA_ESTADO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo 'El estado y la llave deben vivir fuera de git.' >&2; exit 1
fi
[[ $(stat -c '%a:%u' "$EIRA_ESTADO_DIR") == "700:$(id -u)" ]] || {
  echo 'El estado debe ser privado (0700) y del usuario del servicio.' >&2; exit 1; }
exec 9>"$EIRA_ESTADO_DIR/worker.lock"
flock --nonblock 9 || { echo 'Ya hay un trabajador para este estado.' >&2; exit 1; }
"$SELMA_PYTHON" "$(dirname "$0")/verificar-estado-selma.py"
key="$EIRA_ESTADO_DIR/hmac.key"
if [[ ! -e $key ]]; then
  [[ ! -e $EIRA_ESTADO_DIR/eira.sqlite ]] || {
    echo 'Existe SQLite sin su llave: restaura la llave original.' >&2; exit 1; }
  "$SELMA_PYTHON" -c 'import secrets,sys; open(sys.argv[1], "x").write(secrets.token_hex(32))' "$key"
fi
[[ -f $key && ! -L $key && -s $key && $(stat -c '%a:%u' "$key") == "600:$(id -u)" ]]
EIRA_HMAC_KEY=$(<"$key")
export EIRA_HMAC_KEY
cd "$SELMA_PY"
exec "$SELMA_PYTHON" -m procesador.worker
