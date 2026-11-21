"""Pruebas de la base de reporte SQLite (Tarea 1; segunda pasada)."""
import sqlite3
import subprocess
import sys

import pytest

from db import crear

TABLAS = {"fuentes", "personas", "registros", "anomalias", "pares_persona",
          "bitacora", "denominadores", "identidades", "iniciativas",
          "tipos_de_registro", "roles_de_persona", "iniciativa_tipo", "municipios"}
VISTAS = {"v_conteos", "v_personas_por_ciudad", "v_personas_por_programa",
          "v_cruce_programas", "v_edad", "v_cobertura", "v_calidad",
          "v_objetos", "v_global", "v_presencia", "v_presencia_municipios",
          "v_pares_pendientes"}


@pytest.fixture
def db(tmp_path):
    ruta = tmp_path / "t.sqlite"
    con = crear.crear(str(ruta))
    yield con
    con.close()


def inserta_persona(con, pid="p1"):
    con.execute("INSERT INTO personas(id, certeza) VALUES (?, 'id')", (pid,))


def inserta_fuente(con, fid="f1", iniciativa="tamizaje-rosa", tipo="atencion"):
    con.execute(
        "INSERT INTO fuentes(id, nombre, iniciativa_id, tipo_registro, fecha_corte, cargada_en)"
        " VALUES (?, 'r.xlsx', ?, ?, '2026-09-30', '2026-11-21T00:00:00Z')",
        (fid, iniciativa, tipo))


def inserta_registro(con, rid, fid="f1", pid="p1", iniciativa="tamizaje-rosa",
                     tipo="atencion", rol="beneficiaria", contado=1,
                     municipio_clave="", estado=""):
    con.execute(
        "INSERT INTO registros(id, fuente_id, fila, persona_id, iniciativa_id,"
        " tipo_registro, rol_persona, municipio_clave, estado, huella_fila, contado)"
        " VALUES (?,?,?,?,?,?,?,?,?,'h',?)",
        (rid, fid, 1, pid, iniciativa, tipo, rol, municipio_clave, estado, contado))


def test_tablas_y_vistas_existen(db):
    nombres = {r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
    assert TABLAS <= nombres
    vistas = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='view'")}
    assert VISTAS <= vistas


def test_catalogos_cargados(db):
    assert db.execute("SELECT count(*) FROM iniciativas").fetchone()[0] >= 7
    assert db.execute("SELECT count(*) FROM tipos_de_registro").fetchone()[0] == 7
    assert db.execute("SELECT count(*) FROM roles_de_persona").fetchone()[0] == 4
    # melenas: donacion -> donante, producto_entregado -> beneficiaria
    filas = dict(db.execute(
        "SELECT tipo_clave, rol FROM iniciativa_tipo"
        " WHERE iniciativa_id='melenas-en-movimiento'"))
    assert filas == {"donacion": "donante", "producto_entregado": "beneficiaria"}


def test_municipios_cargados(db):
    assert db.execute("SELECT count(*) FROM municipios").fetchone()[0] == 2478
    assert db.execute(
        "SELECT count(*) FROM municipios WHERE estado_clave='14'").fetchone()[0] == 125
    assert db.execute(
        "SELECT municipio FROM municipios WHERE clave='14023'").fetchone()[0] == \
        "Zapotlán el Grande"


def test_tipo_invalido_rechazado(db):
    inserta_fuente(db)
    with pytest.raises(sqlite3.IntegrityError):
        inserta_registro(db, "r1", tipo="abrazo")


def test_iniciativa_desconocida_rechazada(db):
    with pytest.raises(sqlite3.IntegrityError):
        inserta_fuente(db, iniciativa="narnia")


def test_estrellas_fuera_de_rango_rechazada(db):
    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            "INSERT INTO fuentes(id, nombre, iniciativa_id, tipo_registro, fecha_corte, cargada_en, estrellas)"
            " VALUES ('f9','x','tamizaje-rosa','atencion','2026-01-01','2026-01-01T00:00:00Z',6)")


def test_vistas_de_personas_y_cruce(db):
    inserta_fuente(db)
    inserta_persona(db)
    inserta_registro(db, "r1")
    inserta_registro(db, "r2")
    inserta_registro(db, "r3", iniciativa="melenas-en-movimiento",
                   tipo="donacion", rol="donante")
    db.commit()
    assert db.execute("SELECT personas FROM v_cruce_programas").fetchone()[0] == 1
    por_programa = {r[0]: (r[1], r[2]) for r in db.execute(
        "SELECT iniciativa, personas_impactadas, donantes FROM v_personas_por_programa")}
    assert por_programa == {"tamizaje-rosa": (1, 0), "melenas-en-movimiento": (0, 1)}
    # En el global la misma persona cuenta dos veces; el dato informativo es 1.
    g = db.execute("SELECT * FROM v_global").fetchone()
    assert g[0] == 1 and g[1] == 1 and g[2] == 1


def test_contado_cero_no_suma(db):
    inserta_fuente(db)
    inserta_persona(db)
    inserta_registro(db, "r1", contado=1)
    inserta_registro(db, "r2", contado=0)
    db.commit()
    assert db.execute("SELECT total FROM v_conteos").fetchone()[0] == 1


def test_objetos_y_presencia(db):
    inserta_fuente(db, fid="f2", iniciativa="melenas-en-movimiento", tipo="segun_fila")
    inserta_persona(db, "p2")
    inserta_registro(db, "o1", fid="f2", pid="p2", iniciativa="melenas-en-movimiento",
                     tipo="producto_entregado", rol="beneficiaria",
                     municipio_clave="14023", estado="Jalisco")
    inserta_registro(db, "o2", fid="f2", pid="p2", iniciativa="melenas-en-movimiento",
                     tipo="donacion", rol="donante",
                     municipio_clave="14023", estado="Jalisco")
    db.commit()
    objetos = dict(db.execute("SELECT tipo_registro, cantidad FROM v_objetos"))
    assert objetos == {"producto_entregado": 1.0, "donacion": 1.0}
    p = db.execute("SELECT * FROM v_presencia").fetchone()
    assert p == ("melenas-en-movimiento", "Jalisco", 1, 125, 2, 1)


def test_v_calidad_y_pares(db):
    inserta_fuente(db)
    db.execute("UPDATE fuentes SET filas_nuevas=9, filas_omitidas=3 WHERE id='f1'")
    db.execute("INSERT INTO anomalias(fuente_id, fila, regla) VALUES ('f1',4,'faltante')")
    inserta_persona(db, "pa")
    inserta_persona(db, "pb")
    db.execute("INSERT INTO pares_persona(id, persona_a, persona_b, motivo)"
               " VALUES ('par-1','pa','pb','Mismo ID, nombres distintos')")
    db.commit()
    cal = db.execute("SELECT fuente, filas_nuevas, filas_omitidas, regla, problemas"
                     " FROM v_calidad WHERE fuente='f1'").fetchone()
    assert cal == ("f1", 9, 3, "faltante", 1)
    pend = db.execute("SELECT id, motivo FROM v_pares_pendientes").fetchone()
    assert pend == ("par-1", "Mismo ID, nombres distintos")


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
