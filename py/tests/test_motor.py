"""Pruebas del motor de punta a punta (Tarea 3 del plan; segunda pasada).

Valkey 6391 base 15, SQLite temporal por prueba.
"""
import json
import os
import sqlite3
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
ESPERADO = json.loads((REPO / "reportes" / "esperado.json").read_text("utf-8"))


def test_caso_de_la_guia(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='atencion' and contado=1") == 120
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='donacion' and contado=1") == 60
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='producto_entregado' and contado=1") == 20
    assert motor.sql("select count(*) from personas") == \
        ESPERADO["globales"]["personas_identificadas"]
    assert motor.sql("select count(*) from pares_persona where estado='pendiente'") == 5


def test_roles_por_fila(motor):
    """Un mismo archivo trae donaciones (donante) y entregas (beneficiaria):
    el tipo y el rol se deciden por fila segun el catalogo."""
    motor.procesar("melenas-en-movimiento.xlsx")
    roles = dict(motor.db.execute(
        "select rol_persona, count(*) from registros group by rol_persona"))
    assert roles == {"donante": 60, "beneficiaria": 20}
    # Conjuntos en Valkey: todas las del programa, impactadas y donantes.
    assert motor.v.scard("eira:per:programa:melenas-en-movimiento") == 80
    assert motor.v.scard("eira:per:impactadas:melenas-en-movimiento") == 20
    assert motor.v.scard("eira:per:donantes:melenas-en-movimiento") == 60
    # Las donantes no cuentan como personas impactadas en las vistas.
    fila = motor.db.execute(
        "select personas_impactadas, donantes from v_personas_por_programa"
        " where iniciativa='melenas-en-movimiento'").fetchone()
    assert fila == (20, 60)


def test_global_suma_sin_deduplicar(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    g = ESPERADO["globales"]
    fila = motor.db.execute("select * from v_global").fetchone()
    assert fila[0] == g["impactadas"]["tamizaje-rosa"] + \
        g["impactadas"]["melenas-en-movimiento"]
    # 15 cruzan de verdad + 5 pares pendientes que cuentan como una en
    # ambos programas (mientras nadie decida).
    assert fila[1] == g["cruce_con_pares_pendientes"]
    assert fila[2] == g["donantes"]["melenas-en-movimiento"]


def test_mismo_reporte_con_otro_nombre(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    for nombre, nivel in [("reporte_final_2.xlsx", "identico"),
                          ("tamizaje-rosa-reguardado.xlsx", "mismo_contenido"),
                          ("tamizaje-rosa.csv", "mismo_contenido")]:
        t = motor.procesar(nombre)
        assert t["estado"] == "duplicado", nombre
        assert t["nivel_duplicado"] == nivel, nombre
        assert "tamizaje-rosa.xlsx" in t["mensaje"], t["mensaje"]
    assert motor.sql("select count(*) from fuentes") == 1
    # mismo_contenido se dedujo de las huellas de fila, sin clave de contenido.
    assert motor.v.exists("eira:huellas:contenido") == 0


def test_version_nueva_solo_agrega_lo_nuevo(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    t = motor.procesar("tamizaje-rosa_v2.xlsx")
    assert t["nivel_duplicado"] == "version_nueva"
    assert int(t["filas_nuevas"]) == 8
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='atencion' and contado=1") == 128


def test_traslape_entre_coordinaciones(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    t = motor.procesar("nutricion.xlsx")
    assert t["nivel_duplicado"] == "traslape_parcial"
    assert int(t["filas_omitidas"]) == 30
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='atencion' and contado=1") == 130


def test_mismo_id_personas_distintas_no_se_unen_solas(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    pares = motor.db.execute(
        "select motivo, count(*) from pares_persona group by motivo").fetchall()
    por_motivo = dict(pares)
    assert por_motivo.get("Mismo ID, nombres distintos") == 2
    assert por_motivo.get("Posible variante de escritura") == 3
    # Ningun par se une solo: las dos identidades siguen siendo personas aparte.
    assert motor.sql("select count(*) from pares_persona where estado!='pendiente'") == 0


def test_fallo_a_media_carga_permite_reintentar(motor, monkeypatch):
    from py.motor import escribir
    real = escribir.guardar

    def explosivo(*a, **kw):
        raise RuntimeError("caida simulada a media carga")

    monkeypatch.setattr(escribir, "guardar", explosivo)
    from py.motor import worker
    tid = worker.encolar(motor.v, (REPO / "reportes/tamizaje-rosa.xlsx").read_bytes(),
                         "tamizaje-rosa.xlsx", "tamizaje-rosa", "atencion", "2026-09-30")
    with pytest.raises(RuntimeError):
        worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    # Nada quedo marcado: ni fuente ni huella de archivo.
    assert motor.sql("select count(*) from fuentes") == 0
    assert motor.sql("select count(*) from registros") == 0
    assert motor.v.hlen("eira:huellas:archivo") == 0

    monkeypatch.setattr(escribir, "guardar", real)
    worker.procesar_trabajo(motor.v, motor.db, tid, vb=motor.vb)
    t = motor.v.hgetall(f"eira:trabajo:{tid}")
    assert t["estado"] == "listo"
    assert motor.sql("select count(*) from fuentes") == 1


def test_dos_trabajos_seguidos_no_pierden_filas(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    # 126 (130 - 4 repetidas) + 80: todas las filas unicas se conservan.
    assert motor.sql("select count(*) from registros where contado=1") == 206


def test_reporte_sin_personas(motor):
    (REPO / "reportes/agregado_publico.csv").write_text(
        "municipio,estudios_realizados\nZapotlán el Grande,45\nSayula,12\n", "utf-8")
    try:
        t = motor.procesar("agregado_publico.csv")
    finally:
        (REPO / "reportes/agregado_publico.csv").unlink()
    assert t["estado"] == "listo"
    assert "no trae identificador de persona" in t["mensaje"]
    assert motor.sql("select count(*) from personas") == 0
    sinid = motor.v.hvals("eira:sinid")
    assert sum(int(x) for x in sinid) == 57


def test_reporte_publico_con_clave_de_municipio(motor):
    """Un reporte publico trae la clave INEGI directa (cvegeo): se usa tal
    cual, sin buscar el nombre, y alimenta la presencia."""
    (REPO / "reportes/def_publico.csv").write_text(
        "cvegeo_resid,causa_grupo,edad_anios\n"
        "14108,C50,38\n14100,C53,51\n14023,C50,44\n", "utf-8")
    try:
        t = motor.procesar("def_publico.csv", programa="salud-publica-jalisco",
                           unidad="registro_publico", fecha_corte="2026-09-30")
    finally:
        (REPO / "reportes/def_publico.csv").unlink()
    assert t["estado"] == "listo"
    lugares = motor.db.execute(
        "select municipio_clave, municipio from registros order by fila").fetchall()
    assert lugares[0][0] == "14108" and lugares[0][1] == "Tuxpan"
    assert lugares[2][0] == "14023"
    assert motor.v.hget("eira:presencia:salud-publica-jalisco", "14108") == "1"
    assert motor.v.hget("eira:presencia:global", "14023") == "1"


def test_alias_de_ciudad_y_desconocida(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    # "Ciudad Guzmán" y "Cd. Guzmán" caen en Zapotlán el Grande (14023).
    n = motor.sql("select count(*) from registros where municipio_clave='14023'")
    assert n > 0
    # Una ciudad inexistente queda como anomalia y no entra a la presencia.
    assert motor.sql("select count(*) from anomalias"
                     " where regla='ciudad_desconocida'") == 2
    pres = motor.db.execute(
        "select estado, municipios_del_estado from v_presencia"
        " where iniciativa_id='tamizaje-rosa'").fetchone()
    assert pres == ("Jalisco", 125)
    desconocidas = motor.v.hget("eira:presencia:tamizaje-rosa", "")
    assert desconocidas is None


def test_estado_de_la_columna_manda(motor):
    """Si el archivo trae columna de estado, se usa esa para resolver."""
    (REPO / "reportes/por_estado.csv").write_text(
        "id,nombre,ciudad,estado\n"
        "AAA19800101,Ana Ana Ana,Tepatitlán de Morelos,Jalisco\n"
        "BBB19850202,Berta Berta Berta,Tepatitlán,Jalisco\n", "utf-8")
    try:
        t = motor.procesar("por_estado.csv", programa="tamizaje-rosa",
                           unidad="atencion", fecha_corte="2026-09-30")
    finally:
        (REPO / "reportes/por_estado.csv").unlink()
    assert t["estado"] == "listo"
    lugares = motor.db.execute(
        "select municipio_clave, estado from registros order by fila").fetchall()
    assert lugares[0] == ("14093", "Jalisco")
    # "Tepatitlán" no es nombre oficial: queda sin resolver -> anomalia.
    assert lugares[1][0] == ""
    assert motor.sql("select count(*) from anomalias"
                     " where regla='ciudad_desconocida'") == 1


def test_sin_nombres_en_sqlite_ni_valkey(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    prohibidos = ["María Elena López", "Mónica Esther Luna", "Carmen Alicia Vega",
                  "Carmen Alisia Vega", "MEL19840312", "CAV19880504"]
    # Valkey: ningun valor los contiene (salvo eira:archivo:*, que es el
    # archivo crudo que sube el frontend y caduca en una hora).
    for clave in motor.v.scan_iter("eira:*"):
        if clave.startswith("eira:archivo:"):
            continue
        tipo = motor.v.type(clave)
        if tipo == "string":
            valores = [motor.v.get(clave)]
        elif tipo == "hash":
            valores = list(motor.v.hgetall(clave).items())
            valores = [str(x) for par in valores for x in par]
        elif tipo == "list":
            valores = motor.v.lrange(clave, 0, -1)
        elif tipo == "set":
            valores = list(motor.v.smembers(clave))
        elif tipo == "zset":
            valores = motor.v.zrange(clave, 0, -1)
        elif tipo == "stream":
            valores = [str(x) for _, c in motor.v.xrange(clave) for x in c.items()]
        else:
            continue
        texto = " ".join(str(x) for x in valores)
        for p in prohibidos:
            assert p not in texto, f"{p} encontrado en {clave}"
    # SQLite: ninguna columna de texto los contiene.
    volcado = "\n".join(motor.db.iterdump())
    for p in prohibidos:
        assert p not in volcado, f"{p} encontrado en SQLite"


def test_contrato(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    motor.procesar("nutricion.xlsx")
    r = subprocess.run(["npm", "run", "verificar"], cwd=REPO, capture_output=True,
                       text=True, env={**os.environ,
                                       "VALKEY_URL": "redis://127.0.0.1:6391/15",
                                       "VERIFICAR_ATENCION": "130",
                                       "VERIFICAR_PROGRAMA_A": "tamizaje-rosa",
                                       "VERIFICAR_PROGRAMA_B": "melenas-en-movimiento",
                                       # 15 cruzan de verdad + 5 pares pendientes
                                       # que cuentan como una persona en ambos.
                                       "VERIFICAR_CRUCE": "20"})
    assert r.returncode == 0, r.stdout + r.stderr


def test_decision_misma_persona_fusiona(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select id, persona_a, persona_b from pares_persona"
        " where motivo='Posible variante de escritura' limit 1").fetchone()
    antes_todas = motor.v.scard("eira:per:todas")
    cruce_keys = ["eira:per:programa:tamizaje-rosa",
                  "eira:per:programa:melenas-en-movimiento"]
    antes_cruce = motor.v.sintercard(2, cruce_keys)
    motor.decidir("persona", par=par[0], decision="misma")
    assert motor.sql("select estado from pares_persona where id=?", par[0]) == "misma"
    # El par ya contaba como UNA mientras estaba pendiente: las cifras no
    # se mueven al confirmar "misma".
    assert motor.v.scard("eira:per:todas") == antes_todas
    assert motor.v.sintercard(2, cruce_keys) == antes_cruce
    # Los registros de persona_b pasan a persona_a, que sobrevive.
    assert motor.sql("select count(*) from registros where persona_id=?", par[2]) == 0
    assert motor.sql("select count(*) from registros where persona_id=?", par[1]) == 2


def test_decision_distinta_solo_marca(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("melenas-en-movimiento.xlsx")
    par = motor.db.execute(
        "select id from pares_persona where motivo='Mismo ID, nombres distintos'"
        " limit 1").fetchone()
    motor.decidir("persona", par=par[0], decision="distinta")
    assert motor.sql("select estado from pares_persona where id=?", par[0]) == "distinta"


def test_restituir_fila(motor):
    motor.procesar("tamizaje-rosa.xlsx")
    motor.procesar("nutricion.xlsx")
    fid = motor.sql("select id from fuentes where nombre='nutricion.xlsx'")
    fila = motor.sql("select fila from registros where fuente_id=? and contado=0"
                     " and cantidad>0 limit 1", fid)
    antes = motor.sql("select sum(cantidad) from registros"
                      " where tipo_registro='atencion' and contado=1")
    motor.decidir("restituir_fila", fuente=fid, fila=str(fila))
    assert motor.sql("select sum(cantidad) from registros"
                     " where tipo_registro='atencion' and contado=1") == antes + 1
    assert motor.v.llen(f"eira:omitidas:{fid}") == 29
    # filas_omitidas de la fuente baja en SQLite y en Valkey.
    assert motor.sql("select filas_omitidas from fuentes where id=?", fid) == 29
    assert motor.v.hget(f"eira:fuente:{fid}", "filas_omitidas") == "29"
