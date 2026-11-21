"""Pruebas de la tercera pasada del motor (correcciones de revision-motor.md).

Valkey 6391 base 15, SQLite temporal por prueba.
"""
import json
import os
import sqlite3
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
REPORTES = REPO / "reportes"

from py.motor import worker  # noqa: E402


def _encolar(motor, nombre="tamizaje-rosa.xlsx", programa="tamizaje-rosa",
             unidad="atencion", fecha_corte="2026-09-30"):
    return worker.encolar(motor.v, (REPORTES / nombre).read_bytes(), nombre,
                          programa, unidad, fecha_corte, por="pruebas")


# --- Hallazgo 4: clave HMAC sin valor por defecto ------------------------------

def test_sin_clave_hmac_no_hay_huellas(motor, monkeypatch):
    from py.motor import huellas
    monkeypatch.delenv("IMPACTO_HMAC_KEY", raising=False)
    with pytest.raises(RuntimeError, match="IMPACTO_HMAC_KEY"):
        huellas.clave_hmac()


def test_sin_clave_hmac_el_worker_no_arranca(motor, monkeypatch, capsys):
    monkeypatch.delenv("IMPACTO_HMAC_KEY", raising=False)
    with pytest.raises(SystemExit) as exc:
        worker.main()
    assert exc.value.code != 0
    assert "IMPACTO_HMAC_KEY" in capsys.readouterr().err


# --- Hallazgo 2: mensajes recuperables -----------------------------------------

def test_pendiente_se_reclama_y_procesa(motor):
    """Un mensaje tomado por un consumidor que murio se recupera al arrancar."""
    worker.asegurar_grupos(motor.v)
    tid = _encolar(motor)
    # Otro consumidor lo toma y muere: queda pendiente, sin ack.
    resp = motor.v.xreadgroup(worker.GRUPO, "otro-consumidor",
                              {"eira:trabajos": ">"}, count=1)
    assert resp and resp[0][1]
    worker.reclamar_pendientes(motor.v, motor.db, vb=motor.vb, min_idle_ms=0)
    assert motor.v.hget(f"eira:trabajo:{tid}", "estado") == "listo"
    assert motor.v.xpending("eira:trabajos", worker.GRUPO)["pending"] == 0


def test_fallo_no_hace_ack_y_tercera_entrega_marca_error(motor, monkeypatch):
    """Un trabajo que siempre falla: no se hace ack hasta la 3a entrega, y
    entonces queda en estado error con mensaje para la persona."""
    worker.asegurar_grupos(motor.v)
    tid = _encolar(motor)
    resp = motor.v.xreadgroup(worker.GRUPO, worker.CONSUMIDOR,
                              {"eira:trabajos": ">"}, count=1)
    msg_id, campos = resp[0][1][0]

    def explosivo(*a, **kw):
        raise RuntimeError("fallo persistente")

    monkeypatch.setattr(worker, "procesar_trabajo", explosivo)
    for entrega in (1, 2):
        worker._manejar(motor.v, motor.db, "eira:trabajos", msg_id, campos,
                        vb=motor.vb)
        assert motor.v.xpending("eira:trabajos", worker.GRUPO)["pending"] == 1
    worker._manejar(motor.v, motor.db, "eira:trabajos", msg_id, campos,
                    vb=motor.vb)
    assert motor.v.xpending("eira:trabajos", worker.GRUPO)["pending"] == 0
    t = motor.v.hgetall(f"eira:trabajo:{tid}")
    assert t["estado"] == "error"
    assert "fallo persistente" not in t["mensaje"]  # sin texto de excepcion


def test_exito_hace_ack(motor):
    worker.asegurar_grupos(motor.v)
    tid = _encolar(motor)
    resp = motor.v.xreadgroup(worker.GRUPO, worker.CONSUMIDOR,
                              {"eira:trabajos": ">"}, count=1)
    msg_id, campos = resp[0][1][0]
    worker._manejar(motor.v, motor.db, "eira:trabajos", msg_id, campos,
                    vb=motor.vb)
    assert motor.v.xpending("eira:trabajos", worker.GRUPO)["pending"] == 0
    assert motor.v.hget(f"eira:trabajo:{tid}", "estado") == "listo"


# --- Hallazgo 1: divergencia SQLite/Valkey + reconstruir -----------------------

def _borrar_resultados(v):
    """Borra las claves eira:* de resultados; deja colas y trabajos."""
    for k in list(v.scan_iter("eira:*")):
        if k.startswith(("eira:trabajo:", "eira:archivo:", "eira:trabajos",
                         "eira:decisiones", "eira:eventos")):
            continue
        v.delete(k)


def test_fuente_en_sqlite_sin_valkey_se_repara(motor):
    """La fuente quedo en SQLite pero el EXEC de Valkey se perdio: el
    reintento no responde 'identico', re-emite la parte de Valkey."""
    motor.procesar("tamizaje-rosa.xlsx")
    fid = motor.sql("select id from fuentes")
    _borrar_resultados(motor.v)
    assert not motor.v.exists(f"eira:fuente:{fid}")
    t = motor.procesar("tamizaje-rosa.xlsx")
    assert t["estado"] == "listo"
    assert "identico" not in (t.get("nivel_duplicado") or "") or \
        "volví a publicar" in t["mensaje"]
    assert motor.v.exists(f"eira:fuente:{fid}")
    assert motor.v.scard("eira:per:todas") > 0
    assert motor.v.zscore("eira:fuentes", fid) is not None
    # y las huellas de fila vuelven para la deduplicacion futura
    assert motor.v.hlen("eira:huellas:fila") > 0


def test_reconstruir_todo_rehace_las_cifras(motor):
    """Si se pierde Valkey entero, reconstruir rehace eira:* desde SQLite."""
    from py.motor import reconstruir
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    per = motor.v.scard("eira:per:todas")
    cnt = sum(int(float(x)) for x in motor.v.hvals("eira:cnt:atencion"))
    pres = int(motor.v.hget("eira:presencia:global", "14023") or 0)
    _borrar_resultados(motor.v)
    res = reconstruir.reconstruir_todo(motor.db, motor.v)
    assert res["fuentes"] == 2
    assert motor.v.scard("eira:per:todas") == per
    assert sum(int(float(x)) for x in motor.v.hvals("eira:cnt:atencion")) == cnt
    assert int(motor.v.hget("eira:presencia:global", "14023")) == pres
    assert motor.v.zcard("eira:fuentes") == 2
    assert motor.v.hlen("eira:pares") == 5
    # las colas quedaron intactas
    assert motor.v.xlen("eira:trabajos") == 2


# --- Hallazgo 10: restituir fila conserva la cantidad --------------------------

def test_restituir_fila_agregada_conserva_cantidad(motor):
    (REPORTES / "ag_a.csv").write_text(
        "municipio,estudios_realizados\nZapopan,45\n", "utf-8")
    (REPORTES / "ag_b.csv").write_text(
        "municipio,estudios_realizados\nZapopan,45\nTlaquepaque,10\n", "utf-8")
    try:
        motor.procesar("ag_a.csv", programa="salud-publica-jalisco",
                       unidad="registro_publico", fecha_corte="2026-09-30")
        motor.procesar("ag_b.csv", programa="salud-publica-jalisco",
                       unidad="registro_publico", fecha_corte="2026-09-30")
    finally:
        (REPORTES / "ag_a.csv").unlink()
        (REPORTES / "ag_b.csv").unlink()
    fid_b = motor.sql("select id from fuentes where nombre='ag_b.csv'")
    fila = motor.sql("select fila from registros where fuente_id=? and contado=0",
                     fid_b)
    # La cantidad real de la fila se conserva aunque este omitida.
    assert motor.sql("select cantidad from registros"
                     " where fuente_id=? and fila=?", fid_b, fila) == 45
    motor.decidir("restituir_fila", fuente=fid_b, fila=str(fila))
    sinid = sum(int(float(x)) for x in motor.v.hvals("eira:sinid"))
    assert sinid == 100  # 45 (ag_a) + 45 restituidas + 10 de Tlaquepaque
    # filas_omitidas se actualiza en SQLite y en Valkey
    assert motor.sql("select filas_omitidas from fuentes where id=?", fid_b) == 0
    assert motor.sql("select filas_nuevas from fuentes where id=?", fid_b) == 2
    assert motor.v.hget(f"eira:fuente:{fid_b}", "filas_omitidas") == "0"
    assert motor.v.hget(f"eira:fuente:{fid_b}", "filas_nuevas") == "2"


# --- Hallazgo 5: decision "misma" duradera e idempotente ----------------------

def test_decision_misma_reasigna_identidades_y_es_idempotente(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select id, persona_a, persona_b from pares_persona"
        " where motivo='Posible variante de escritura' limit 1").fetchone()
    pid, a, b = par
    motor.decidir("persona", par=pid, decision="misma")
    # Las identidades de b quedan reasignadas a a (no borradas): una carga
    # posterior con ese ID y nombre cae en a.
    assert motor.sql("select count(*) from identidades"
                     " where persona_id=?", b) == 0
    n_id_a = motor.sql("select count(*) from identidades"
                       " where persona_id=?", a)
    assert n_id_a >= 2
    # Aplicar la misma decision dos veces no cambia nada.
    motor.decidir("persona", par=pid, decision="misma")
    assert motor.sql("select count(*) from identidades"
                     " where persona_id=?", a) == n_id_a
    assert motor.sql("select count(*) from registros"
                     " where persona_id=?", b) == 0


def test_carga_posterior_mismo_id_y_nombre_cae_en_a(motor):
    import pandas as pd
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select persona_a, persona_b from pares_persona"
        " where motivo='Posible variante de escritura' limit 1").fetchone()
    a, b = par
    ide = motor.db.execute(
        "select fuente, fila from identidades where persona_id=?"
        " limit 1", (b,)).fetchone()
    fid_b, num_fila = ide
    nombre_archivo = motor.sql("select nombre from fuentes where id=?", fid_b)
    crudo = pd.read_excel(REPORTES / nombre_archivo, header=None)
    fila_x = crudo.iloc[num_fila - 1]
    id_eira, nombre = str(fila_x[0]), str(fila_x[1])
    motor.decidir("persona", par=motor.db.execute(
        "select id from pares_persona where persona_a=? and persona_b=?",
        (a, b)).fetchone()[0], decision="misma")
    # Nuevo archivo con ese mismo ID y nombre, fila distinta -> persona a.
    (REPORTES / "reingreso.csv").write_text(
        "id,nombre,ciudad,asistencia,fecha\n"
        f"{id_eira},{nombre},Sayula,Sí,2026-11-01\n", "utf-8")
    try:
        t = motor.procesar("reingreso.csv", programa="tamizaje-rosa",
                           unidad="atencion", fecha_corte="2026-11-30")
    finally:
        (REPORTES / "reingreso.csv").unlink()
    assert t["estado"] == "listo"
    assert motor.sql("select persona_id from registros"
                     " where fuente_id=(select id from fuentes"
                     "  where nombre='reingreso.csv')") == a


# --- Hallazgo 6: par pendiente cuenta como UNA persona ------------------------

def test_par_pendiente_cuenta_como_una(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    assert motor.sql("select count(*) from pares_persona"
                     " where estado='pendiente'") == 5
    identificadas = motor.sql("select count(*) from personas")
    # Valkey: cada par pendiente aporta una sola membresia (la de a).
    assert motor.v.scard("eira:per:todas") == identificadas - 5
    # SQLite: las vistas usan la persona efectiva del par.
    g = motor.db.execute("select total_personas_impactadas,"
                         " personas_en_mas_de_un_programa,"
                         " total_donantes from v_global").fetchone()
    # Con persona_id crudo serian 15 personas en dos programas; con la
    # persona efectiva del par son 20: cada par pendiente es UNA persona
    # presente en ambas iniciativas.
    crudo = motor.sql(
        "select count(*) from (select r.persona_id from registros r"
        " where r.contado = 1 and r.cantidad > 0 and r.persona_id is not null"
        " group by r.persona_id having count(distinct r.iniciativa_id) > 1)")
    assert crudo == 15
    assert g[1] == 20


def test_decision_distinta_las_separa(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select id, persona_a, persona_b from pares_persona"
        " where motivo='Mismo ID, nombres distintos' limit 1").fetchone()
    pid, a, b = par
    antes = motor.v.scard("eira:per:todas")
    motor.decidir("persona", par=pid, decision="distinta")
    # La cifra sube en 1: b vuelve a contar como persona propia.
    assert motor.v.scard("eira:per:todas") == antes + 1
    memb = {k for k in motor.v.scan_iter("eira:per:programa:*")
            if motor.v.sismember(k, b)}
    assert memb, "b debe estar de vuelta en los conjuntos de su programa"


def test_decision_misma_las_deja_unidas(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select id from pares_persona"
        " where motivo='Mismo ID, nombres distintos' limit 1").fetchone()
    antes = motor.v.scard("eira:per:todas")
    motor.decidir("persona", par=par[0], decision="misma")
    assert motor.v.scard("eira:per:todas") == antes
