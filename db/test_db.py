"""Pruebas de la base de reporte SQLite (Tarea 1)."""
import sqlite3
import subprocess
import sys

import pytest

from db import crear

TABLAS = {"fuentes", "personas", "registros", "anomalias", "pares_persona",
          "bitacora", "denominadores", "identidades"}
VISTAS = {"v_conteos", "v_personas_por_ciudad", "v_personas_por_programa",
          "v_cruce_programas", "v_edad", "v_cobertura", "v_calidad"}


@pytest.fixture
def db(tmp_path):
    ruta = tmp_path / "t.sqlite"
    con = crear.crear(str(ruta))
    yield con
    con.close()


def inserta_persona(con, pid="p1"):
    con.execute("INSERT INTO personas(id, certeza) VALUES (?, 'id')", (pid,))


def inserta_fuente(con, fid="f1"):
    con.execute(
        "INSERT INTO fuentes(id, nombre, programa, unidad, fecha_corte, cargada_en)"
        " VALUES (?, 'r.xlsx', 'Tamizaje Rosa', 'atencion', '2026-09-30', '2026-11-21T00:00:00Z')",
        (fid,))


def inserta_registro(con, rid, fid="f1", pid="p1", programa="Tamizaje Rosa",
                     unidad="atencion", contado=1):
    con.execute(
        "INSERT INTO registros(id, fuente_id, fila, persona_id, programa, unidad,"
        " huella_fila, contado) VALUES (?,?,?,?,?,?,'h',?)",
        (rid, fid, 1, pid, programa, unidad, contado))


def test_tablas_y_vistas_existen(db):
    nombres = {r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    assert TABLAS <= nombres
    vistas = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='view'")}
    assert VISTAS <= vistas


def test_unidad_invalida_rechazada(db):
    inserta_fuente(db)
    with pytest.raises(sqlite3.IntegrityError):
        inserta_registro(db, "r1", unidad="abrazo")


def test_estrellas_fuera_de_rango_rechazada(db):
    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            "INSERT INTO fuentes(id, nombre, programa, unidad, fecha_corte, cargada_en, estrellas)"
            " VALUES ('f9','x','P','atencion','2026-01-01','2026-01-01T00:00:00Z',6)")


def test_vistas_de_personas_y_cruce(db):
    inserta_fuente(db)
    inserta_persona(db)
    inserta_registro(db, "r1")
    inserta_registro(db, "r2")
    inserta_registro(db, "r3", programa="Salud que Florece", unidad="participacion")
    db.commit()
    assert db.execute("SELECT personas FROM v_cruce_programas").fetchone()[0] == 1
    por_programa = dict(db.execute("SELECT programa, personas FROM v_personas_por_programa"))
    assert por_programa == {"Tamizaje Rosa": 1, "Salud que Florece": 1}


def test_contado_cero_no_suma(db):
    inserta_fuente(db)
    inserta_persona(db)
    inserta_registro(db, "r1", contado=1)
    inserta_registro(db, "r2", contado=0)
    db.commit()
    assert db.execute("SELECT total FROM v_conteos").fetchone()[0] == 1


def test_denominadores_cli(tmp_path):
    ruta = tmp_path / "d.sqlite"
    subprocess.run([sys.executable, "-m", "db.crear", "--con-denominadores"],
                   env={"IMPACTO_DB": str(ruta), "PATH": "/usr/bin:/bin"},
                   check=True, cwd=".")
    con = sqlite3.connect(ruta)
    assert con.execute("SELECT count(*) FROM denominadores").fetchone()[0] == 125
    assert con.execute(
        "SELECT mujeres_25_64 FROM denominadores WHERE municipio_clave='14023'"
    ).fetchone()[0] == 30089
    con.close()
