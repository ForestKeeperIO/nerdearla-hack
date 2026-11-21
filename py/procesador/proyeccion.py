"""Proyecta la base local a las claves de Valkey del contrato.

Se reescribe todo lo que es derivado (personas, conteos, fuentes, anomalías, pares,
métricas) en una sola transacción MULTI/EXEC. No toca las claves del frontend
(trabajos, decisiones, archivos, denominadores, informes) ni la bitácora.

Reglas de personas (catalogos/iniciativas.json):
- `eira:per:*` solo lleva personas que cuentan como impactadas (beneficiarias y participantes).
- Donantes y voluntarias van aparte, en `eira:don:*`.
- Informe Global: personas = suma de las de cada programa (quien está en dos programas cuenta dos
  veces); cuántas están en más de uno se informa aparte.
"""
from __future__ import annotations

import datetime as dt
import json
from collections import defaultdict

from .analizar import h
from .texto import edad_en, parse_fecha

PATRONES_PROPIOS = ["eira:fuente:*", "eira:anom:*", "eira:omitidas:*", "eira:per:*", "eira:don:*",
                    "eira:cnt:*", "eira:valores:*", "eira:met:*"]
CLAVES_PROPIAS = ["eira:fuentes", "eira:nac", "eira:sinid", "eira:pares"]


def _borrar_propias(v):
    claves = list(CLAVES_PROPIAS)
    for patron in PATRONES_PROPIOS:
        claves += [k.decode() if isinstance(k, bytes) else k for k in v.scan_iter(match=patron, count=500)]
    return claves


def _edad_promedio(nacs: list[dt.date], corte: dt.date) -> tuple[float | None, int]:
    edades = [edad_en(n, corte) for n in nacs if n <= corte]
    return (round(sum(edades) / len(edades), 1), len(edades)) if edades else (None, 0)


def proyectar(v, con, llave: bytes, catalogo) -> dict:
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
    don = defaultdict(set)
    todas: set[str] = set()
    todas_don: set[str] = set()
    por_fuente = defaultdict(lambda: {"nuevas": 0, "omitidas": 0, "inasist": 0})
    # Métricas por programa
    M = defaultdict(lambda: {"cnt": defaultdict(int), "sinid": 0, "inasist": 0, "ciudades": set(),
                             "personas": set(), "fuentes": 0, "estrellas": 5, "corte": ""})
    for fid, f in fuentes.items():
        m = M[f["programa"]]
        m["fuentes"] += 1
        m["estrellas"] = min(m["estrellas"], f["estrellas"])
        m["corte"] = max(m["corte"], f["fecha_corte"] or "")

    for r in con.execute("SELECT * FROM filas"):
        f = fuentes[r["fuente"]]
        prog = f["programa"]
        if r["estado"] != "contada":
            por_fuente[r["fuente"]]["omitidas"] += 1
            continue
        por_fuente[r["fuente"]]["nuevas"] += 1
        m = M[prog]
        if not r["asistencia"]:
            por_fuente[r["fuente"]]["inasist"] += 1
            m["inasist"] += 1
            continue  # una inasistencia no es una atención ni una persona atendida
        tipo = r["tipo"] or f["unidad"]
        cantidad = r["cantidad"] if catalogo.se_cuenta_objetos(tipo) else 1
        campo = f"{prog}|{r['ciudad']}|{r['periodo']}|{r['servicio']}"
        cnt[tipo][campo] += cantidad
        m["cnt"][tipo] += cantidad
        if r["ciudad"]:
            m["ciudades"].add(r["ciudad"])
        for dim, val in (("programa", prog), ("ciudad", r["ciudad"]),
                         ("periodo", r["periodo"]), ("servicio", r["servicio"])):
            if val:
                valores[dim].add(val)
        if not r["id_h"]:
            sinid[campo] += 1
            m["sinid"] += 1
            continue
        pid = persona(r)
        rol = catalogo.rol(prog, tipo)
        if not catalogo.cuenta_como_impactada(rol):
            todas_don.add(pid)
            don[f"eira:don:programa:{prog}"].add(pid)
            continue
        todas.add(pid)
        m["personas"].add(pid)
        per[f"eira:per:programa:{prog}"].add(pid)
        for dim, val in (("ciudad", r["ciudad"]), ("periodo", r["periodo"]), ("servicio", r["servicio"])):
            if val:
                per[f"eira:per:{dim}:{val}"].add(pid)
        if r["nac"]:
            nac[pid] = r["nac"]
        if r["folio"]:
            con_folio.add(pid)

    if todas:
        pipe.sadd("eira:per:todas", *todas)
        if con_folio:
            pipe.sadd("eira:per:certeza:folio", *con_folio)
        if todas - con_folio:
            pipe.sadd("eira:per:certeza:id", *(todas - con_folio))
    for k, miembros in per.items():
        pipe.sadd(k, *miembros)
    if todas_don:
        pipe.sadd("eira:don:todas", *todas_don)
    for k, miembros in don.items():
        pipe.sadd(k, *miembros)
    if nac:
        pipe.hset("eira:nac", mapping=nac)
    for tipo, campos in cnt.items():
        pipe.hset(f"eira:cnt:{tipo}", mapping=dict(campos))
    if sinid:
        pipe.hset("eira:sinid", mapping=dict(sinid))
    for dim, vals in valores.items():
        pipe.sadd(f"eira:valores:{dim}", *vals)

    # --- Métricas por programa y Global (eira:met:<alcance>) ---
    hoy = dt.date.today()
    por_programa = {}
    for prog, m in M.items():
        corte = parse_fecha(m["corte"]) or hoy
        nacs = [parse_fecha(nac[p]) for p in m["personas"] if p in nac]
        edad, n_edad = _edad_promedio([n for n in nacs if n], corte)
        met = {"programa": prog, "nombre": catalogo.iniciativas[prog].nombre,
               "personas": len(m["personas"]), "donantes": len(don.get(f"eira:don:programa:{prog}", ())),
               "sin_identificar": m["sinid"], "inasistencias": m["inasist"], "municipios": len(m["ciudades"]),
               "fuentes": m["fuentes"], "estrellas_min": m["estrellas"], "fecha_corte": m["corte"],
               "edad_promedio": "" if edad is None else edad, "edad_n": n_edad,
               "unidades": json.dumps(dict(m["cnt"]), ensure_ascii=False)}
        for tipo, c in m["cnt"].items():
            met[f"cnt_{tipo}"] = c
        por_programa[prog] = (met, m, nacs, corte)
        pipe.hset(f"eira:met:{prog}", mapping={k: str(x) for k, x in met.items()})

    if por_programa:
        miembro_en = defaultdict(int)
        pares_edad, cnt_global = [], defaultdict(int)
        ciudades_g, sinid_g, inasist_g = set(), 0, 0
        for prog, (met, m, nacs, corte) in por_programa.items():
            for p in m["personas"]:
                miembro_en[p] += 1
            pares_edad += [edad_en(n, corte) for n in nacs if n and n <= corte]
            for tipo, c in m["cnt"].items():
                cnt_global[tipo] += c
            ciudades_g |= m["ciudades"]
            sinid_g += m["sinid"]
            inasist_g += m["inasist"]
        g = {
            "personas": sum(len(m["personas"]) for _, m, _, _ in por_programa.values()),
            "personas_unicas_en_total": len(miembro_en),
            "personas_en_mas_de_un_programa": sum(1 for c in miembro_en.values() if c > 1),
            "donantes": sum(met["donantes"] for met, *_ in por_programa.values()),
            "sin_identificar": sinid_g, "inasistencias": inasist_g, "municipios": len(ciudades_g),
            "fuentes": sum(m["fuentes"] for _, m, _, _ in por_programa.values()),
            "estrellas_min": min(m["estrellas"] for _, m, _, _ in por_programa.values()),
            "fecha_corte": max(m["corte"] for _, m, _, _ in por_programa.values()),
            "edad_promedio": round(sum(pares_edad) / len(pares_edad), 1) if pares_edad else "",
            "edad_n": len(pares_edad),
            "programas": json.dumps(sorted(por_programa), ensure_ascii=False),
            "unidades": json.dumps(dict(cnt_global), ensure_ascii=False),
        }
        for tipo, c in cnt_global.items():
            g[f"cnt_{tipo}"] = c
        pipe.hset("eira:met:global", mapping={k: str(x) for k, x in g.items()})

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
