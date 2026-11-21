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


# --- Calidad: una versión nueva no se penaliza por lo ya cargado ----------------

def test_version_nueva_no_pierde_estrellas_por_filas_ya_cargadas(motor):
    t1 = motor.procesar("tamizaje-rosa.xlsx")
    t2 = motor.procesar("tamizaje-rosa_v2.xlsx")
    e1 = int(motor.v.hget(f"eira:fuente:{t1['fuente']}", "estrellas"))
    e2 = int(motor.v.hget(f"eira:fuente:{t2['fuente']}", "estrellas"))
    assert t2["nivel_duplicado"] == "version_nueva"
    assert e2 >= e1, (e1, e2)


# --- Privacidad: el Excel crudo no se queda en Valkey ---------------------------

def test_archivo_crudo_se_borra_al_terminar(motor):
    """El archivo subido trae nombres; en cuanto el trabajo termina se borra
    de Valkey (la caducidad de una hora queda solo como red de seguridad)."""
    worker.asegurar_grupos(motor.v)
    tid = _encolar(motor)
    assert motor.vb.exists(f"eira:archivo:{tid}") == 1
    resp = motor.v.xreadgroup(worker.GRUPO, worker.CONSUMIDOR,
                              {"eira:trabajos": ">"}, count=1)
    msg_id, campos = resp[0][1][0]
    worker._manejar(motor.v, motor.db, "eira:trabajos", msg_id, campos,
                    vb=motor.vb)
    assert motor.v.hget(f"eira:trabajo:{tid}", "estado") == "listo"
    assert motor.vb.exists(f"eira:archivo:{tid}") == 0


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


# --- Hallazgo 3: reclamo atomico de huellas (HSETNX) ---------------------------

def test_reclamo_hsetnx_es_atomico(motor):
    """Dos fuentes que comparten filas: quien reclama primero la huella la
    cuenta; la segunda la marca como ya cargada."""
    primera = {"h-uno": 2, "h-dos": 3}
    assert worker._reclamar_huellas(motor.v, "f-aaa", primera) == {}
    # Otra fuente reclama huellas: una compartida, una nueva.
    dueños = worker._reclamar_huellas(
        motor.v, "f-bbb", {"h-uno": 9, "h-tres": 4})
    assert dueños == {"h-uno": "f-aaa:2"}
    # La misma fuente re-reclama lo suyo (reintento tras caida): no cuenta
    # como duplicado de otra.
    assert worker._reclamar_huellas(motor.v, "f-aaa", {"h-dos": 7}) == {}
    assert motor.v.hget("eira:huellas:fila", "h-dos") == "f-aaa:3"


def test_reintento_tras_reclamo_no_se_auto_omite(motor, monkeypatch):
    """Caida despues del reclamo y antes del commit: al reintentar, las
    huellas que ya eran de esta fuente no la hacen verse como duplicada."""
    from py.motor import escribir
    monkeypatch.setattr(escribir, "guardar",
                        lambda *a, **kw: (_ for _ in ()).throw(
                            RuntimeError("caida tras reclamo")))
    tid = _encolar(motor)
    with pytest.raises(RuntimeError):
        worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    monkeypatch.undo()
    worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    t = motor.v.hgetall(f"eira:trabajo:{tid}")
    assert t["estado"] == "listo"
    assert int(t["filas_nuevas"]) == 126


# --- Hallazgo 7 y 11: celdas combinadas y CSV real -----------------------------

def test_celdas_combinadas_se_rellenan_hacia_abajo(motor):
    import io
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["ID", "Nombre", "Ciudad", "Asistencia"])
    ws.append(["AAA19800101", "Ana Ana Ana", "Sayula", "Sí"])
    ws.append(["BBB19850202", "Berta Berta Berta", None, "Sí"])
    ws.merge_cells("C2:C3")  # Ciudad combinada: Berta hereda Sayula
    buf = io.BytesIO()
    wb.save(buf)
    tid = worker.encolar(motor.v, buf.getvalue(), "combinadas.xlsx",
                         "tamizaje-rosa", "atencion", "2026-09-30")
    worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    claves = [r[0] for r in motor.db.execute(
        "select municipio_clave from registros order by fila")]
    assert claves[0] == claves[1] != ""
    assert motor.sql("select count(*) from anomalias"
                     " where regla='ciudad_desconocida'") == 0


def test_csv_punto_y_coma_y_latin1(motor):
    contenido = ("ID;Nombre;Ciudad;Asistencia\n"
                 "AAA19800101;Ana García;Sayula;Sí\n"
                 "BBB19850202;Berta Núñez;Tamazula de Gordiano;No\n")
    (REPORTES / "latin.csv").write_bytes(contenido.encode("latin-1"))
    try:
        t = motor.procesar("latin.csv", programa="tamizaje-rosa",
                           unidad="atencion", fecha_corte="2026-09-30")
    finally:
        (REPORTES / "latin.csv").unlink()
    assert t["estado"] == "listo"
    assert int(t["filas_nuevas"]) == 2
    assert motor.sql("select count(*) from registros") == 2


def test_csv_utf8_con_bom(motor):
    (REPORTES / "bom.csv").write_bytes(
        "﻿ID,Nombre,Ciudad\nAAA19800101,Ana Ana Ana,Sayula\n".encode("utf-8"))
    try:
        t = motor.procesar("bom.csv", programa="tamizaje-rosa",
                           unidad="atencion", fecha_corte="2026-09-30")
    finally:
        (REPORTES / "bom.csv").unlink()
    assert t["estado"] == "listo"
    assert int(t["filas_nuevas"]) == 1


# --- Hallazgo 9: filas sin ID no se unen por nombre ----------------------------

def test_sin_id_no_se_unen_por_nombre(motor):
    """Dos 'María López' sin ID en coordinaciones distintas: no se fusionan,
    cada fila queda sin persona identificada."""
    (REPORTES / "sinid_a.csv").write_text(
        "ID,Nombre,Ciudad\n,María López,Sayula\n", "utf-8")
    (REPORTES / "sinid_b.csv").write_text(
        "ID,Nombre,Ciudad\n,María López,Tamazula de Gordiano\n", "utf-8")
    try:
        motor.procesar("sinid_a.csv", programa="tamizaje-rosa",
                       unidad="atencion", fecha_corte="2026-09-30")
        motor.procesar("sinid_b.csv", programa="comunidades-de-origen",
                       unidad="atencion", fecha_corte="2026-09-30")
    finally:
        (REPORTES / "sinid_a.csv").unlink()
        (REPORTES / "sinid_b.csv").unlink()
    assert motor.sql("select count(*) from personas") == 0
    assert motor.sql("select count(*) from registros"
                     " where persona_id is null") == 2
    assert motor.sql("select count(*) from pares_persona") == 0


# --- Hallazgo 10 (menores): mensajes, unidad, limites --------------------------

def test_xlsm_se_rechaza_con_mensaje(motor):
    tid = worker.encolar(motor.v, b"PK\x03\x04falso", "reporte.xlsm",
                         "tamizaje-rosa", "atencion", "2026-09-30")
    t = worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    assert t["estado"] == "error"
    assert "xlsm" in t["mensaje"].lower()


def test_mas_de_20000_filas_se_rechaza(motor):
    lineas = ["ID,Nombre,Ciudad"] + \
        [f"AAA{19800101 + i % 9000:08d},Persona {i},Sayula"
         for i in range(20_001)]
    (REPORTES / "gigante.csv").write_text("\n".join(lineas), "utf-8")
    try:
        t = motor.procesar("gigante.csv", programa="tamizaje-rosa",
                           unidad="atencion", fecha_corte="2026-09-30")
    finally:
        (REPORTES / "gigante.csv").unlink()
    assert t["estado"] == "error"
    assert "20" in t["mensaje"] and "filas" in t["mensaje"]


def test_unidad_invalida_es_error_no_ya_cargado(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    t = motor.procesar("tamizaje-rosa.xlsx", unidad="insumo_raro")
    assert t["estado"] == "error"
    assert "insumo_raro" in t["mensaje"]
    assert "ya se carg" not in t["mensaje"]


def test_error_no_muestra_texto_de_excepcion(motor, capsys):
    tid = worker.encolar(motor.v, b"\x00\x01basura-no-excel", "raro.xlsx",
                         "tamizaje-rosa", "atencion", "2026-09-30")
    t = worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    assert t["estado"] == "error"
    for frag in ("zip", "Bad", "corrupt", "Traceback"):
        assert frag.lower() not in t["mensaje"].lower()


def test_inasistencias_no_cuenta_omitidas(motor):
    """Una fila omitida con inasistencia no debe inflar el contador."""
    motor.procesar("tamizaje-rosa.xlsx")
    t = motor.procesar("tamizaje-rosa_v2.xlsx")
    f = motor.v.hgetall("eira:fuente:" + t["fuente"])
    # inasistencias = filas contadas con cantidad 0, nunca filas omitidas.
    n = motor.db.execute(
        "select count(*) from registros r where r.fuente_id=? and r.contado=1"
        " and r.cantidad=0", (t["fuente"],)).fetchone()[0]
    assert int(f["inasistencias"]) == n
