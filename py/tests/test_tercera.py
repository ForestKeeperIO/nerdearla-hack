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
