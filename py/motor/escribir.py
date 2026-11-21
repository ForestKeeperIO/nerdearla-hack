"""Escritura de resultados: SQLite en una transaccion, luego Valkey.

Orden importante para poder reintentar tras una caida:
1. SQLite: todo o nada (fuentes, personas, identidades, registros, anomalias,
   pares, bitacora).
2. Valkey: un solo MULTI/EXEC con las claves del contrato; las huellas del
   archivo van al final, asi que un archivo a medias no queda marcado.
"""
import hashlib
import json
import time
import unicodedata

import pandas as pd

from db import catalogo

H_ARCHIVO = "eira:huellas:archivo"
H_FILA = "eira:huellas:fila"

MESES = ("ene", "feb", "mar", "abr", "may", "jun",
         "jul", "ago", "sep", "oct", "nov", "dic")


def ahora() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def slug(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def fuente_id_de(huella_b: str) -> str:
    return "f-" + huella_b[:12]


def campo_conteo(iniciativa: str, ciudad: str, periodo: str, servicio: str) -> str:
    return f"{iniciativa}|{ciudad}|{periodo}|{servicio}"


def par_id(a: str, b: str) -> str:
    return "par-" + hashlib.sha256("|".join(sorted([a, b])).encode()).hexdigest()[:10]


def _json(d) -> str:
    return json.dumps(d, ensure_ascii=False)


def _incr(pipe, clave: str, campo: str, cantidad) -> None:
    if cantidad == int(cantidad):
        pipe.hincrby(clave, campo, int(cantidad))
    else:
        pipe.hincrbyfloat(clave, campo, cantidad)


def guardar(db, v, fuente: dict, df: pd.DataFrame, anomalias: list[dict],
            pares: list[dict], veredicto: dict, vinculacion=None) -> None:
    fid = fuente["id"]
    ini = fuente["iniciativa_id"]
    en = ahora()
    impactados = catalogo.roles_impactados()

    # --- 1. SQLite: una transaccion -------------------------------------------
    with db:
        db.execute(
            "INSERT INTO fuentes(id, nombre, iniciativa_id, tipo_registro, fecha_corte,"
            " cargada_en, por, filas, filas_nuevas, filas_omitidas, inasistencias,"
            " estrellas, puntaje, huella_bytes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (fid, fuente["nombre"], ini, fuente["unidad"],
             fuente["fecha_corte"], en, fuente.get("por", ""),
             fuente["filas"], fuente["filas_nuevas"], fuente["filas_omitidas"],
             fuente["inasistencias"], fuente["estrellas"], fuente["puntaje"],
             fuente["huella_bytes"]))
        if vinculacion is not None:
            db.executemany(
                "INSERT OR IGNORE INTO personas(id, certeza, fecha_nacimiento, ciudad)"
                " VALUES (?,?,?,?)",
                [(p["id"], p["certeza"], p["fecha_nacimiento"], p["ciudad"])
                 for p in vinculacion.personas_nuevas])
            db.executemany(
                "INSERT OR IGNORE INTO identidades(clave, nombre_clave, persona_id,"
                " etiqueta, fuente, fila, nacimiento) VALUES (?,?,?,?,?,?,?)",
                [(i["clave"], i["nombre_clave"], i["persona_id"], i["etiqueta"],
                  i["fuente"], i["fila"], i["nacimiento"])
                 for i in vinculacion.identidades_nuevas])
        db.executemany(
            "INSERT INTO registros(id, fuente_id, fila, persona_id, iniciativa_id,"
            " tipo_registro, rol_persona, servicio, fecha, periodo, ciudad,"
            " estado_clave, estado, municipio_clave, municipio, cantidad,"
            " huella_fila, contado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [(f"{fid}:{int(r.fila)}", fid, int(r.fila), r.persona_id,
              ini, r.tipo_registro, r.rol_persona or None, r.servicio or "",
              r.fecha or "", r.periodo or "", r.ciudad or "",
              r.estado_clave or "", r.estado or "",
              r.municipio_clave or "", r.municipio or "",
              float(r.cantidad) if r.contado else 0.0, r.huella_fila, int(r.contado))
             for r in df.itertuples(index=False)])
        db.executemany(
            "INSERT INTO anomalias(fuente_id, fila, regla, campo, detalle)"
            " VALUES (?,?,?,?,?)",
            [(fid, a["fila"], a["regla"], a["campo"], a["detalle"]) for a in anomalias])
        db.executemany(
            "INSERT OR IGNORE INTO pares_persona(id, persona_a, persona_b, probabilidad,"
            " motivo, estado) VALUES (?,?,?,?,?,'pendiente')",
            [(par_id(p["persona_a"], p["persona_b"]), p["persona_a"], p["persona_b"],
              p["probabilidad"], p["motivo"]) for p in pares])
        db.execute(
            "INSERT INTO bitacora(en, por, tipo, detalle) VALUES (?,?,?,?)",
            (en, "motor", "carga",
             f"Se cargó '{fuente['nombre']}': {fuente['filas_nuevas']} filas nuevas, "
             f"{fuente['filas_omitidas']} omitidas."))

    # --- 2. Valkey: un solo MULTI/EXEC; las huellas van al final ---------------
    pipe = v.pipeline(transaction=True)
    pipe.zadd("eira:fuentes", {fid: int(time.time())})
    pipe.hset(f"eira:fuente:{fid}", mapping={
        "nombre": fuente["nombre"], "programa": ini,
        "unidad": fuente["unidad"], "fecha_corte": fuente["fecha_corte"],
        "cargada_en": en, "por": fuente.get("por", ""),
        "filas": str(fuente["filas"]), "filas_nuevas": str(fuente["filas_nuevas"]),
        "filas_omitidas": str(fuente["filas_omitidas"]),
        "inasistencias": str(fuente["inasistencias"]),
        "estrellas": str(fuente["estrellas"]), "puntaje": str(fuente["puntaje"]),
        "motivos": _json(fuente.get("motivos", []))})
    for a in anomalias:
        pipe.rpush(f"eira:anom:{fid}", _json(a))
    for r in df.itertuples(index=False):
        if not r.contado:
            pipe.rpush(f"eira:omitidas:{fid}", _json(
                {"fila": int(r.fila), "ya_en_fuente": r.ya_en_fuente,
                 "ya_en_fila": int(r.ya_en_fila)}))

    sets_tocados: set[str] = set()
    for r in df.itertuples(index=False):
        if not r.contado:
            continue
        campo = campo_conteo(ini, r.ciudad or "", r.periodo or "", r.servicio or "")
        if r.persona_id:
            if r.cantidad > 0:
                _incr(pipe, f"eira:cnt:{r.tipo_registro}", campo, r.cantidad)
                claves = [f"eira:per:programa:{ini}",
                          f"eira:per:certeza:{r.certeza}"]
                if r.rol_persona in impactados:
                    claves.append(f"eira:per:impactadas:{ini}")
                if r.rol_persona == "donante":
                    claves.append(f"eira:per:donantes:{ini}")
                claves += [
                    f"eira:per:ciudad:{r.ciudad}" if r.ciudad else None,
                    f"eira:per:periodo:{r.periodo}" if r.periodo else None,
                    f"eira:per:servicio:{r.servicio}" if r.servicio else None]
                for clave in claves:
                    if clave:
                        pipe.sadd(clave, r.persona_id)
                        sets_tocados.add(clave)
                pipe.sadd("eira:per:todas", r.persona_id)
                if r.nacimiento:
                    pipe.hset("eira:nac", r.persona_id, r.nacimiento)
        else:
            _incr(pipe, "eira:sinid", campo, r.cantidad)
        if r.municipio_clave:
            pipe.hincrby(f"eira:presencia:{ini}", r.municipio_clave, 1)
            pipe.hincrby("eira:presencia:global", r.municipio_clave, 1)
    for dimension, valores in (
            ("programa", {ini}),
            ("ciudad", {r.ciudad for r in df.itertuples(index=False) if r.ciudad}),
            ("periodo", {r.periodo for r in df.itertuples(index=False) if r.periodo}),
            ("servicio", {r.servicio for r in df.itertuples(index=False) if r.servicio}),
            ("estado", {r.estado for r in df.itertuples(index=False) if r.estado})):
        for valor in valores:
            pipe.sadd(f"eira:valores:{dimension}", valor)

    for p in pares:
        pipe.hsetnx("eira:pares", par_id(p["persona_a"], p["persona_b"]), _json({
            "id": par_id(p["persona_a"], p["persona_b"]), "estado": "pendiente",
            "motivo": p["motivo"], "a": p["a"], "b": p["b"]}))

    # Huellas AL FINAL: un archivo a medias no queda marcado.
    pipe.hset(H_ARCHIVO, fuente["huella_bytes"], fid)
    for r in df.itertuples(index=False):
        if r.contado:
            pipe.hset(H_FILA, r.huella_fila, f"{fid}:{int(r.fila)}")
    pipe.xadd("eira:bitacora", {"en": en, "por": "motor", "tipo": "carga",
                              "detalle": f"Se cargó '{fuente['nombre']}' "
                                         f"({fuente['filas_nuevas']} filas nuevas)."})
    pipe.set("eira:contrato", "1", nx=True)
    pipe.execute()

    for tipo, eid in (("fuente", fid),):
        v.publish("eira:eventos", _json({"tipo": tipo, "id": eid}))


def registrar_duplicado(v, trabajo_id: str, veredicto: dict, nombre: str,
                        filas: int, mapeo: list) -> None:
    """Marca el trabajo como duplicado sin importar nada."""
    v.hset(f"eira:trabajo:{trabajo_id}", mapping={
        "estado": "duplicado", "mensaje": veredicto["mensaje"],
        "nivel_duplicado": veredicto["nivel"], "fuente": "",
        "fuente_original": veredicto["fuente_original"],
        "filas": str(filas), "filas_nuevas": "0", "filas_omitidas": str(filas),
        "filas_repetidas": "0", "mapeo": _json(mapeo), "terminado_en": ahora()})
    v.xadd("eira:bitacora", {"en": ahora(), "por": "motor", "tipo": "duplicado",
                           "detalle": f"Se rechazó '{nombre}': {veredicto['nivel']}."})
    v.publish("eira:eventos", _json({"tipo": "trabajo", "id": trabajo_id}))
