"""Impide que el primer trabajo reemplace la proyección de otro motor."""
import os
import sqlite3
from pathlib import Path

import valkey


def main():
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], decode_responses=True,
                               password=os.getenv("VALKEY_PASSWORD") or None, socket_timeout=5)
    ruta = Path(os.environ["EIRA_ESTADO_DIR"]) / "eira.sqlite"
    locales = set()
    if ruta.exists():
        with sqlite3.connect(ruta.as_uri() + "?mode=ro", uri=True) as con:
            locales = {r[0] for r in con.execute("SELECT id FROM fuentes")}
    publicadas = set(v.zrange("eira:fuentes", 0, -1))
    if locales != publicadas or v.exists("eira:huellas:archivo", "eira:huellas:fila"):
        raise SystemExit("Valkey no corresponde a este SQLite. No arrancar: usar un par de estados verificado.")
    if not locales and v.exists("eira:per:todas", "eira:don:todas", "eira:met:global"):
        raise SystemExit("Hay una proyección previa sin fuentes. No se reemplazará.")


if __name__ == "__main__":
    main()
