"""Crea la base de reporte SQLite en IMPACTO_DB (por defecto data/impacto.sqlite).

Uso:
    uv run python -m db.crear [--con-denominadores]

Con la opcion carga publicos/jalisco_mun_denominadores_2020.csv (INEGI, Censo 2020).
"""
import csv
import os
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ESQUEMA = Path(__file__).with_name("esquema.sql")
CSV_DEN = RAIZ / "publicos" / "jalisco_mun_denominadores_2020.csv"


def crear(ruta: str | None = None, con_denominadores: bool = False) -> sqlite3.Connection:
    ruta = ruta or os.environ.get("IMPACTO_DB", "data/impacto.sqlite")
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ruta)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(ESQUEMA.read_text(encoding="utf-8"))
    if con_denominadores:
        cargar_denominadores(con)
    con.commit()
    return con


def cargar_denominadores(con: sqlite3.Connection) -> int:
    with CSV_DEN.open(encoding="utf-8") as f:
        filas = [
            (r["cvegeo"], r["nom_mun"], int(r["mujeres_25_64"]), "INEGI Censo 2020", 2020)
            for r in csv.DictReader(f)
        ]
    con.executemany(
        "INSERT OR REPLACE INTO denominadores(municipio_clave, municipio, mujeres_25_64, fuente, anio)"
        " VALUES (?,?,?,?,?)", filas)
    return len(filas)


def main() -> None:
    con_denominadores = "--con-denominadores" in sys.argv
    ruta = os.environ.get("IMPACTO_DB", "data/impacto.sqlite")
    con = crear(ruta, con_denominadores)
    n = con.execute("SELECT count(*) FROM denominadores").fetchone()[0]
    con.close()
    extra = f"; {n} denominadores" if con_denominadores else ""
    print(f"Base creada en {ruta}{extra}")


if __name__ == "__main__":
    main()
