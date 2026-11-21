"""Crea la base de reporte SQLite en IMPACTO_DB (por defecto data/impacto.sqlite).

Siempre carga los catalogos: catalogos/iniciativas.json (iniciativas, tipos
de registro, roles y su relacion) y publicos/municipios_mexico.json.

Uso:
    uv run python -m db.crear [--con-denominadores]

Con la opcion carga publicos/jalisco_mun_denominadores_2020.csv (INEGI, Censo 2020).
"""
import csv
import os
import sqlite3
import sys
from pathlib import Path

from db import catalogo

RAIZ = Path(__file__).resolve().parent.parent
ESQUEMA = Path(__file__).with_name("esquema.sql")
CSV_DEN = RAIZ / "publicos" / "jalisco_mun_denominadores_2020.csv"


def crear(ruta: str | None = None, con_denominadores: bool = False) -> sqlite3.Connection:
    ruta = ruta or os.environ.get("IMPACTO_DB", "data/impacto.sqlite")
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ruta)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(ESQUEMA.read_text(encoding="utf-8"))
    cargar_catalogos(con)
    cargar_municipios(con)
    if con_denominadores:
        cargar_denominadores(con)
    con.commit()
    return con


def cargar_catalogos(con: sqlite3.Connection) -> None:
    con.executemany(
        "INSERT OR REPLACE INTO tipos_de_registro(clave, etiqueta, plural,"
        " se_cuenta, cuenta_personas) VALUES (?,?,?,?,?)",
        [(t["clave"], t["etiqueta"], t["plural"], t["se_cuenta"],
          int(t["cuenta_personas"])) for t in catalogo.tipos_de_registro()])
    con.executemany(
        "INSERT OR REPLACE INTO roles_de_persona(clave, etiqueta,"
        " cuenta_como_impactada) VALUES (?,?,?)",
        [(r["clave"], r["etiqueta"], int(r["cuenta_como_impactada"]))
         for r in catalogo.roles_de_persona()])
    for ini in catalogo.iniciativas():
        con.execute(
            "INSERT OR REPLACE INTO iniciativas(id, nombre, clase, descripcion,"
            " rol_por_defecto, estado, en_demo) VALUES (?,?,?,?,?,?,?)",
            (ini["id"], ini["nombre"], ini.get("clase"), ini.get("descripcion"),
             ini.get("rol_por_defecto"), ini.get("estado"),
             int(bool(ini.get("en_demo")))))
        for tipo in ini["tipos_de_registro"]:
            con.execute(
                "INSERT OR REPLACE INTO iniciativa_tipo(iniciativa_id, tipo_clave,"
                " rol) VALUES (?,?,?)",
                (ini["id"], tipo, catalogo.rol_de(ini, tipo)))


def cargar_municipios(con: sqlite3.Connection) -> int:
    filas = [(m["clave"], m["municipio"], m["estado_clave"], m["estado"])
             for m in catalogo.municipios()]
    con.executemany(
        "INSERT OR REPLACE INTO municipios(clave, municipio, estado_clave, estado)"
        " VALUES (?,?,?,?)", filas)
    return len(filas)


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
    m = con.execute("SELECT count(*) FROM municipios").fetchone()[0]
    i = con.execute("SELECT count(*) FROM iniciativas").fetchone()[0]
    con.close()
    extra = f"; {n} denominadores" if con_denominadores else ""
    print(f"Base creada en {ruta} ({i} iniciativas, {m} municipios{extra})")


if __name__ == "__main__":
    main()
