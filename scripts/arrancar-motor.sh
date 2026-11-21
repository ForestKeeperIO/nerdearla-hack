#!/usr/bin/env bash
# Crea la base de reporte si no existe y arranca el worker del motor en
# primer plano. Todo se configura por variables de entorno:
#   VALKEY_URL (con numero de base), VALKEY_PASSWORD, IMPACTO_DB, IMPACTO_HMAC_KEY
set -euo pipefail
cd "$(dirname "$0")/.."
export IMPACTO_DB="${IMPACTO_DB:-data/impacto.sqlite}"
if [ ! -f "$IMPACTO_DB" ]; then
  uv run python -m db.crear --con-denominadores
fi
exec uv run python -m py.motor.worker
