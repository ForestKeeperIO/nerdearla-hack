"""Proyecta la base local a las claves de Valkey del contrato.

Se reescribe todo lo que es derivado (personas, conteos, fuentes, anomalías, pares)
en una sola transacción MULTI/EXEC. No toca las claves del frontend (trabajos,
decisiones, archivos, denominadores) ni la bitácora.
"""
from __future__ import annotations

import datetime as dt
import json
from collections import defaultdict

from .analizar import h

PATRONES_PROPIOS = ["eira:fuente:*", "eira:anom:*", "eira:omitidas:*", "eira:per:*", "eira:cnt:*",
                    "eira:valores:*"]
CLAVES_PROPIAS = ["eira:fuentes", "eira:nac", "eira:sinid", "eira:pares"]


def _borrar_propias(v):
    claves = list(CLAVES_PROPIAS)
    for patron in PATRONES_PROPIOS:
        claves += [k.decode() if isinstance(k, bytes) else k for k in v.scan_iter(match=patron, count=500)]
    return claves


def proyectar(v, con, llave: bytes) -> dict:
    claves_viejas = _borrar_propias(v)
    pipe = v.pipeline(transaction=True)
    if claves_viejas:
        pipe.unlink(*claves_viejas)

    separadas = {(r["id_h"], r["nombre_h_b"]) for r in
                 con.execute("SELECT id_h, nombre_h_b FROM pares WHERE estado='distinta'")}

    def persona(r) -> str:
        if (r["id_h"], r["nombre_h"]) in separadas:
            return "p" + h(llave, "sep", r["id_h"], r["nombre_h"])
        return "p" + r["id_h"]

    fuentes = {r["id"]: r for r in con.execute("SELECT * FROM fuentes ORDER BY cargada_en, rowid")}
    cnt: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    sinid: dict[str, int] = defaultdict(int)
    valores: dict[str, set] = defaultdict(set)
    nac: dict[str, str] = {}
    con_folio: set[str] = set()
    per = defaultdict(set)
    todas: set[str] = set()
    por_fuente = defaultdict(lambda: {"nuevas": 0, "omitidas": 0, "inasist": 0})

    for r in con.execute("SELECT * FROM filas"):
        f = fuentes[r["fuente"]]
        if r["estado"] != "contada":
            por_fuente[r["fuente"]]["omitidas"] += 1
            continue
        por_fuente[r["fuente"]]["nuevas"] += 1
        if not r["asistencia"]:
            por_fuente[r["fuente"]]["inasist"] += 1
            continue  # una inasistencia no es una atención ni una persona atendida
        campo = f"{f['programa']}|{r['ciudad']}|{r['periodo']}|{r['servicio']}"
        cnt[f["unidad"]][campo] += r["cantidad"] if f["unidad"] == "entrega_insumo" else 1
        for dim, val in (("programa", f["programa"]), ("ciudad", r["ciudad"]),
                         ("periodo", r["periodo"]), ("servicio", r["servicio"])):
            if val:
                valores[dim].add(val)
        if not r["id_h"]:
            sinid[campo] += 1
            continue
        pid = persona(r)
        todas.add(pid)
        per[f"eira:per:programa:{f['programa']}"].add(pid)
        for dim, val in (("ciudad", r["ciudad"]), ("periodo", r["periodo"]), ("servicio", r["servicio"])):
            if val:
                per[f"eira:per:{dim}:{val}"].add(pid)
        if r["nac"]:
            nac[pid] = r["nac"]
        if r["folio"]:
            con_folio.add(pid)

    if todas:
        pipe.sadd("eira:per:todas", *todas)
        pipe.sadd("eira:per:certeza:folio", *con_folio) if con_folio else None
        resto = todas - con_folio
        pipe.sadd("eira:per:certeza:id", *resto) if resto else None
    for k, miembros in per.items():
        pipe.sadd(k, *miembros)
    if nac:
        pipe.hset("eira:nac", mapping=nac)
    for unidad, campos in cnt.items():
        pipe.hset(f"eira:cnt:{unidad}", mapping=dict(campos))
    if sinid:
        pipe.hset("eira:sinid", mapping=dict(sinid))
    for dim, vals in valores.items():
        pipe.sadd(f"eira:valores:{dim}", *vals)

    for fid, f in fuentes.items():
        c = por_fuente[fid]
        pipe.zadd("eira:fuentes", {fid: f["cargada_en"]})
        pipe.hset(f"eira:fuente:{fid}", mapping={
            "nombre": f["nombre"], "programa": f["programa"], "unidad": f["unidad"],
            "fecha_corte": f["fecha_corte"] or "",
            "cargada_en": dt.datetime.fromtimestamp(f["cargada_en"], dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "por": f["por"] or "", "filas": c["nuevas"] + c["omitidas"], "filas_nuevas": c["nuevas"],
            "filas_omitidas": c["omitidas"], "inasistencias": c["inasist"],
            "estrellas": f["estrellas"], "puntaje": f["puntaje"], "motivos": f["motivos"],
        })
        for a in con.execute("SELECT fila, regla, campo, detalle FROM anomalias WHERE fuente=? ORDER BY rowid", (fid,)):
            pipe.rpush(f"eira:anom:{fid}", json.dumps(dict(a), ensure_ascii=False))
        for o in con.execute("SELECT fila, ya_en_fuente, ya_en_fila FROM filas WHERE fuente=? AND estado!='contada' "
                             "ORDER BY fila", (fid,)):
            pipe.rpush(f"eira:omitidas:{fid}", json.dumps(
                {"fila": o["fila"], "ya_en_fuente": o["ya_en_fuente"], "ya_en_fila": o["ya_en_fila"]}))

    for p in con.execute("SELECT * FROM pares ORDER BY rowid"):
        pipe.hset("eira:pares", p["id"], json.dumps({
            "id": p["id"], "estado": p["estado"], "motivo": p["motivo"],
            "a": {"fuente": p["a_fuente"], "fila": p["a_fila"], "etiqueta": p["a_etiqueta"]},
            "b": {"fuente": p["b_fuente"], "fila": p["b_fila"], "etiqueta": p["b_etiqueta"]},
        }, ensure_ascii=False))
    pipe.set("eira:contrato", "1")
    pipe.execute()
    return {"personas": len(todas), "fuentes": len(fuentes)}
