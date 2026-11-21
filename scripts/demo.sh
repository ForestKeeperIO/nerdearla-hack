#!/usr/bin/env bash
# demo.sh — arranque, estado y detención de las versiones en línea del demo EIRA.
#
# Uso: scripts/demo.sh <blanco|real|prueba|ambos> [arrancar|detener|estado|reiniciar]
#
# Por entorno levanta tres procesos con setsid+nohup (registros y PID en .demo/<entorno>/):
#   motor   scripts/arrancar-motor.sh      (rama motor; si no existe, avisa y sigue)
#   web     Next.js en web/                (rama fe; DEMO_WEB_DIR lo cambia)
#   tunel   cloudflared → *.trycloudflare.com, dirección guardada en .demo/<entorno>/url
#
# Entornos (modificables con DEMO_VALKEY_URL, DEMO_PUERTO, DEMO_DB, DEMO_NOMBRE, DEMO_WEB_DIR):
#   blanco  Valkey /0, data/blanco.sqlite, puerto 3100, "En blanco"
#   real    Valkey /1, data/real.sqlite,   puerto 3101, "Con fuentes reales"
#   prueba  Valkey /9, data/prueba.sqlite, puerto 3110, "Prueba"   (solo para ensayos)
#
# "detener" mata solo los PID que este script registró; nada por nombre. Idempotente.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
DEMO_DIR="$RAIZ/.demo"
CLOUDFLARED="${CLOUDFLARED:-/home/ian/.local/bin/cloudflared}"

ENTORNO="${1:-}"
ACCION="${2:-arrancar}"

uso() {
  sed -n '2,16p' "$0"
  exit "${1:-1}"
}

[ -n "$ENTORNO" ] || uso
case "$ACCION" in arrancar|detener|estado|reiniciar) ;; *) uso ;; esac

# --- tabla de entornos -------------------------------------------------------
conf_entorno() {
  case "$1" in
    blanco)
      E_VALKEY="redis://127.0.0.1:6379/0"; E_DB="$RAIZ/data/blanco.sqlite"
      E_PUERTO=3100; E_NOMBRE="En blanco" ;;
    real)
      E_VALKEY="redis://127.0.0.1:6379/1"; E_DB="$RAIZ/data/real.sqlite"
      E_PUERTO=3101; E_NOMBRE="Con fuentes reales" ;;
    prueba)
      E_VALKEY="redis://127.0.0.1:6379/9"; E_DB="$RAIZ/data/prueba.sqlite"
      E_PUERTO=3110; E_NOMBRE="Prueba" ;;
    *) echo "Entorno desconocido: $1" >&2; uso ;;
  esac
  # Anulaciones para ensayos.
  E_VALKEY="${DEMO_VALKEY_URL:-$E_VALKEY}"
  E_DB="${DEMO_DB:-$E_DB}"
  E_PUERTO="${DEMO_PUERTO:-$E_PUERTO}"
  E_NOMBRE="${DEMO_NOMBRE:-$E_NOMBRE}"
  E_WEB="${DEMO_WEB_DIR:-$RAIZ/web}"
  E_DIR="$DEMO_DIR/$1"
}

# --- utilidades --------------------------------------------------------------
vivo() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

pid_de() { [ -f "$1" ] && cat "$1" || true; }

# lanza <nombre> <comando...>; si ya hay PID vivo no hace nada
lanzar() {
  local nombre="$1"; shift
  local pidf="$E_DIR/$nombre.pid" logf="$E_DIR/$nombre.log"
  local pid; pid="$(pid_de "$pidf")"
  if vivo "$pid"; then
    echo "  $nombre: ya corre (PID $pid)"
    return 0
  fi
  rm -f "$pidf"
  echo "  $nombre: arrancando → $logf"
  setsid nohup "$@" >>"$logf" 2>&1 &
  echo $! >"$pidf"
}

matar() {
  local nombre="$1"
  local pidf="$E_DIR/$nombre.pid"
  local pid; pid="$(pid_de "$pidf")"
  if vivo "$pid"; then
    echo "  $nombre: deteniendo PID $pid (y su grupo)"
    # Se lanzó con setsid: el grupo de proceso es el propio PID.
    # Matar al grupo alcanza también a los hijos (p. ej. next-server bajo npm).
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5; do vivo "$pid" || break; sleep 1; done
    vivo "$pid" && { kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid"; } || true
  else
    echo "  $nombre: no estaba corriendo"
  fi
  rm -f "$pidf"
}

puerto_responde() { curl -sf -o /dev/null -m 3 "http://127.0.0.1:$1/" ; }

hmac_key() {
  if [ -f "$RAIZ/.env" ] && grep -q '^IMPACTO_HMAC_KEY=' "$RAIZ/.env"; then
    grep '^IMPACTO_HMAC_KEY=' "$RAIZ/.env" | cut -d= -f2-
    return
  fi
  if [ ! -f "$DEMO_DIR/clave" ]; then
    mkdir -p "$DEMO_DIR"
    (umask 077; openssl rand -hex 32 >"$DEMO_DIR/clave")
    echo "  clave HMAC generada en .demo/clave" >&2
  fi
  cat "$DEMO_DIR/clave"
}

py() { # corre Python del proyecto: uv si hay pyproject, si no python3
  if [ -f "$RAIZ/pyproject.toml" ] && command -v uv >/dev/null; then
    uv run "$@"
  else
    shift   # quita el "python" de la llamada
    python3 "$@"
  fi
}

# --- acciones ----------------------------------------------------------------
arrancar_uno() {
  conf_entorno "$1"
  echo "== $1 ($E_NOMBRE) → base ${E_VALKEY##*/}, puerto $E_PUERTO =="
  mkdir -p "$E_DIR" "$RAIZ/data"

  if ! (echo >/dev/tcp/127.0.0.1/6379) 2>/dev/null; then
    echo "  AVISO: Valkey no responde en 127.0.0.1:6379" >&2
  fi

  # Base SQLite de reporte (rama db/motor).
  if [ ! -f "$E_DB" ]; then
    if [ -f "$RAIZ/db/crear.py" ]; then
      echo "  creando $E_DB"
      if [ -f "$RAIZ/publicos/jalisco_mun_denominadores_2020.csv" ]; then
        IMPACTO_DB="$E_DB" py python -m db.crear --con-denominadores
      else
        IMPACTO_DB="$E_DB" py python -m db.crear
      fi
    else
      echo "  AVISO: falta db/crear.py (rama motor); no se creó $E_DB" >&2
    fi
  fi

  local CLAVE; CLAVE="$(hmac_key)"

  # Motor (rama motor). scripts/arrancar-motor.sh es el contrato de arranque.
  if [ -x "$RAIZ/scripts/arrancar-motor.sh" ]; then
    lanzar motor env VALKEY_URL="$E_VALKEY" IMPACTO_DB="$E_DB" \
      IMPACTO_HMAC_KEY="$CLAVE" "$RAIZ/scripts/arrancar-motor.sh"
  else
    echo "  motor: scripts/arrancar-motor.sh no existe aún (rama motor); se omite" >&2
  fi

  # Frontend (rama fe).
  if [ ! -d "$E_WEB" ]; then
    echo "  web: no existe $E_WEB (rama fe); no se arranca el frontend" >&2
    return 0
  fi
  if [ ! -d "$E_WEB/node_modules" ]; then
    echo "  web: npm ci en $E_WEB"
    (cd "$E_WEB" && npm ci --no-audit --no-fund >>"$E_DIR/npm.log" 2>&1)
  fi
  # Se arranca Next directo con node (sin npm): el PID registrado es el servidor
  # y next-server queda en el mismo grupo de proceso, así `detener` lo alcanza.
  local NEXT="$E_WEB/node_modules/next/dist/bin/next"
  if [ "${DEMO_DEV:-0}" = "1" ]; then
    lanzar web env VALKEY_URL="$E_VALKEY" IMPACTO_DB="$E_DB" \
      IMPACTO_HMAC_KEY="$CLAVE" NOMBRE_ENTORNO="$E_NOMBRE" PORT="$E_PUERTO" \
      sh -c 'cd "$1" && exec node "$2" dev -p "$3"' _ "$E_WEB" "$NEXT" "$E_PUERTO"
  else
    if [ ! -f "$E_WEB/.next/BUILD_ID" ]; then
      echo "  web: npm run build en $E_WEB"
      (cd "$E_WEB" && npm run build >>"$E_DIR/npm.log" 2>&1)
    fi
    lanzar web env VALKEY_URL="$E_VALKEY" IMPACTO_DB="$E_DB" \
      IMPACTO_HMAC_KEY="$CLAVE" NOMBRE_ENTORNO="$E_NOMBRE" PORT="$E_PUERTO" \
      sh -c 'cd "$1" && exec node "$2" start -p "$3"' _ "$E_WEB" "$NEXT" "$E_PUERTO"
  fi

  # Espera a que el frontend responda antes de abrir el túnel.
  for _ in $(seq 1 40); do puerto_responde "$E_PUERTO" && break; sleep 1; done
  puerto_responde "$E_PUERTO" || echo "  AVISO: $E_PUERTO aún no responde; ver $E_DIR/web.log" >&2

  # Túnel público.
  if [ -x "$CLOUDFLARED" ]; then
    lanzar tunel "$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:$E_PUERTO"
    local url="" i
    for i in $(seq 1 25); do
      url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$E_DIR/tunel.log" 2>/dev/null | head -1 || true)"
      [ -n "$url" ] && break
      sleep 1
    done
    if [ -n "$url" ]; then
      echo "$url" >"$E_DIR/url"
      echo "  pública: $url"
    else
      echo "  AVISO: no apareció la dirección del túnel; ver $E_DIR/tunel.log" >&2
    fi
  else
    echo "  tunel: no hay cloudflared en $CLOUDFLARED; solo local http://127.0.0.1:$E_PUERTO" >&2
  fi
}

detener_uno() {
  conf_entorno "$1"
  echo "== $1: detener =="
  matar tunel; matar web; matar motor
  rm -f "$E_DIR/url"
}

estado_uno() {
  conf_entorno "$1"
  echo "== $1 ($E_NOMBRE) · esperado: base ${E_VALKEY##*/}, puerto $E_PUERTO =="
  printf '  %-8s %-8s %-8s %s\n' "proceso" "PID" "vivo" "respuesta"
  local n pid v r
  for n in motor web tunel; do
    pid="$(pid_de "$E_DIR/$n.pid")"; pid="${pid:--}"
    if vivo "$pid"; then v="sí"; else v="no"; fi
    case "$n" in
      web)
        if puerto_responde "$E_PUERTO"; then r="puerto $E_PUERTO OK"; else r="puerto $E_PUERTO sin respuesta"; fi ;;
      tunel)
        if [ -f "$E_DIR/url" ]; then r="$(cat "$E_DIR/url")"; else r="sin dirección"; fi ;;
      *) r="—" ;;
    esac
    printf '  %-8s %-8s %-8s %s\n' "$n" "$pid" "$v" "$r"
  done
}

lista_entornos() {
  case "$ENTORNO" in
    ambos) echo "blanco real" ;;
    *) echo "$ENTORNO" ;;
  esac
}

for e in $(lista_entornos); do
  case "$ACCION" in
    arrancar)  arrancar_uno "$e" ;;
    detener)   detener_uno "$e" ;;
    estado)    estado_uno "$e" ;;
    reiniciar) detener_uno "$e"; arrancar_uno "$e" ;;
  esac
done
