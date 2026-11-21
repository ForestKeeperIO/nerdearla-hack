"""Base local (SQLite) del procesamiento.

Valkey es la *proyección* que lee el frontend; esta base es donde Python guarda
lo que no puede ir a Valkey (por ejemplo el nombre normalizado, necesario para
comparar variantes de escritura). Se puede reconstruir Valkey completo desde aquí.
"""
from __future__ import annotations

import os
import secrets
import sqlite3
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

ESQUEMA = """
CREATE TABLE IF NOT EXISTS fuentes(
  id TEXT PRIMARY KEY, nombre TEXT, programa TEXT, unidad TEXT, fecha_corte TEXT,
  cargada_en INTEGER, por TEXT, sha256 TEXT, canon TEXT, encabezados TEXT, formato TEXT,
  estrellas INTEGER, puntaje INTEGER, motivos TEXT, trabajo TEXT
);
CREATE TABLE IF NOT EXISTS filas(
  rid INTEGER PRIMARY KEY AUTOINCREMENT, fuente TEXT, fila INTEGER, id_h TEXT, nombre_h TEXT,
  nombre_norm TEXT, etiqueta TEXT, ciudad TEXT, servicio TEXT, periodo TEXT, fecha TEXT,
  asistencia INTEGER, cantidad INTEGER, nac TEXT, edad INTEGER, folio INTEGER, huella TEXT,
  estado TEXT, ya_en_fuente TEXT, ya_en_fila INTEGER
);
CREATE INDEX IF NOT EXISTS i_filas_huella ON filas(huella, estado);
CREATE INDEX IF NOT EXISTS i_filas_fuente ON filas(fuente, fila);
CREATE TABLE IF NOT EXISTS anomalias(fuente TEXT, fila INTEGER, regla TEXT, campo TEXT, detalle TEXT);
CREATE TABLE IF NOT EXISTS pares(
  id TEXT PRIMARY KEY, estado TEXT, motivo TEXT, id_h TEXT, nombre_h_a TEXT, nombre_h_b TEXT,
  a_fuente TEXT, a_fila INTEGER, a_etiqueta TEXT, b_fuente TEXT, b_fila INTEGER, b_etiqueta TEXT
);
"""


def directorio_estado() -> Path:
    d = Path(os.environ.get("EIRA_ESTADO_DIR", RAIZ / ".estado"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def abrir(ruta: str | Path | None = None) -> sqlite3.Connection:
    ruta = ruta or directorio_estado() / "eira.sqlite"
    con = sqlite3.connect(str(ruta))
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


def llave_hmac() -> bytes:
    """EIRA_HMAC_KEY, o una llave aleatoria guardada en .estado/ (fuera de git)."""
    env = os.environ.get("EIRA_HMAC_KEY")
    if env:
        return env.encode()
    f = directorio_estado() / "hmac.key"
    if not f.exists():
        f.write_text(secrets.token_hex(32))
        try:
            f.chmod(0o600)
        except OSError:
            pass
    return f.read_text().strip().encode()
