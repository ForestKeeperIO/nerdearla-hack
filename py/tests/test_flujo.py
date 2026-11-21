"""Flujo completo contra Valkey: archivos sintéticos → contrato."""
import json
import uuid

NOMBRES_FICTICIOS = ["María Elena López Mora", "María Elena Landa Mora", "Guadalupe Hernández Mora"]


def fuente_de(v, nombre):
    return next(f.decode() for f in v.zrange("eira:fuentes", 0, -1)
                if v.hget(f"eira:fuente:{f.decode()}", "nombre").decode() == nombre)


def subir(v, proc, ruta, programa="Tamizaje Rosa", unidad="atencion", corte="2026-09-30"):
    t = "t-" + uuid.uuid4().hex[:6]
    v.set(f"eira:archivo:{t}", ruta.read_bytes(), ex=3600)
    job = {"id": t, "nombre": ruta.name, "programa": programa, "unidad": unidad, "fecha_corte": corte, "por": "prueba"}
    v.hset(f"eira:trabajo:{t}", mapping={"estado": "pendiente", **{k: val for k, val in job.items() if k != "id"}})
    proc.procesar_trabajo(job)
    return {k.decode(): val.decode() for k, val in v.hgetall(f"eira:trabajo:{t}").items()}


def test_caso_de_la_guia_y_duplicados(v, proc, archivos):
    d, esp = archivos
    t1 = subir(v, proc, d / "tamizaje-rosa.xlsx")
    assert t1["estado"] == "listo", t1
    assert int(t1["filas"]) == esp["tamizaje_filas"] == 122
    assert int(t1["filas_repetidas"]) == 2 and int(t1["filas_nuevas"]) == 120
    assert json.loads(t1["mapeo"])[0]["campo"] == "id_eira"

    # Capa 1: copia idéntica, re-guardado, otro orden, CSV
    assert subir(v, proc, d / "tamizaje-rosa-copia.xlsx")["nivel_duplicado"] == "identico"
    r = subir(v, proc, d / "tamizaje-rosa-reguardado.xlsx")
    assert (r["estado"], r["nivel_duplicado"]) == ("duplicado", "mismo_contenido") and "vuelto a guardar" in r["mensaje"]
    r = subir(v, proc, d / "tamizaje-rosa-otro-orden.xlsx")
    assert r["nivel_duplicado"] == "mismo_contenido" and "otro orden" in r["mensaje"]
    r = subir(v, proc, d / "tamizaje-rosa.csv")
    assert r["nivel_duplicado"] == "mismo_contenido" and "CSV" in r["mensaje"]
    assert v.zcard("eira:fuentes") == 1  # nada de lo anterior se importó

    # Capa 2: versión nueva
    r = subir(v, proc, d / "tamizaje-rosa-v2.xlsx")
    assert r["nivel_duplicado"] == "version_nueva" and r["estado"] == "listo", r
    assert int(r["filas_nuevas"]) == 8 and int(r["filas_omitidas"]) == 120
    assert v.zcard("eira:fuentes") == 2

    # Segundo programa y traslape parcial
    r = subir(v, proc, d / "salud-que-florece.xlsx", "Salud que Florece", "participacion")
    assert r["estado"] == "listo" and int(r["filas_nuevas"]) == 80
    r = subir(v, proc, d / "nutricion.xlsx", "Nutrición")
    assert r["nivel_duplicado"] == "traslape_parcial" and int(r["filas_omitidas"]) == 30 and int(r["filas_nuevas"]) == 40, r

    # Personas únicas: un solo identificador por persona, conteo exacto con SCARD / SINTERCARD
    cruce = v.sintercard(2, ["eira:per:programa:Tamizaje Rosa", "eira:per:programa:Salud que Florece"])
    assert cruce == esp["cruce_tamizaje_salud"] + 8  # la versión nueva sumó 8 personas, todas también en Salud que Florece
    assert v.scard("eira:per:programa:Salud que Florece") == esp["personas_salud"]
    todas = v.scard("eira:per:todas")
    assert todas == v.scard("eira:per:certeza:id") + v.scard("eira:per:certeza:folio")
    # Atenciones y participaciones no se mezclan
    assert sum(int(x) for x in v.hvals("eira:cnt:participacion")) == 80 - 4  # 4 inasistencias
    assert v.exists("eira:cnt:atencion") and not v.exists("eira:cnt:estudio")

    # Pares: mismo ID con nombres distintos esperan decisión y mientras tanto cuentan como una persona
    pares = {k.decode(): json.loads(x) for k, x in v.hgetall("eira:pares").items()}
    assert len(pares) == 2 and all(p["estado"] == "pendiente" for p in pares.values())
    assert {p["motivo"] for p in pares.values()} == {"Mismo ID, nombres distintos", "Posible variante de escritura"}
    antes = v.scard("eira:per:todas")
    par = next(iter(pares))
    proc.aplicar_decision({"tipo": "persona", "par": par, "decision": "distinta", "por": "prueba"})
    assert v.scard("eira:per:todas") == antes + 1
    assert json.loads(v.hget("eira:pares", par))["estado"] == "distinta"

    # Restituir una fila omitida
    f_nutri = fuente_de(v, "nutricion.xlsx")
    om = json.loads(v.lrange(f"eira:omitidas:{f_nutri}", 0, 0)[0])
    antes_at = sum(int(x) for x in v.hvals("eira:cnt:atencion"))
    proc.aplicar_decision({"tipo": "restituir_fila", "fuente": f_nutri, "fila": str(om["fila"]), "por": "prueba"})
    assert sum(int(x) for x in v.hvals("eira:cnt:atencion")) == antes_at + 1

    # Anomalías sembradas y sin nombres en Valkey
    f1 = fuente_de(v, "tamizaje-rosa.xlsx")
    reglas = {json.loads(x)["regla"] for x in v.lrange(f"eira:anom:{f1}", 0, -1)}
    assert {"faltante", "fecha_futura", "ciudad_desconocida", "id_invalido", "edad_inconsistente",
            "fila_repetida", "posible_correccion"} <= reglas, reglas
    vol = b""
    for k in v.scan_iter("eira:*"):
        t = v.type(k).decode()
        vol += {"string": lambda: v.get(k) or b"", "hash": lambda: str(v.hgetall(k)).encode(),
                "list": lambda: str(v.lrange(k, 0, -1)).encode(), "set": lambda: str(v.smembers(k)).encode(),
                "zset": lambda: str(v.zrange(k, 0, -1)).encode(), "stream": lambda: str(v.xrange(k)).encode()}.get(t, lambda: b"")()
    vol = vol.decode(errors="ignore")
    assert not any(n in vol for n in NOMBRES_FICTICIOS)
    assert v.xlen("eira:bitacora") > 0
    fu = {k.decode(): x.decode() for k, x in v.hgetall(f"eira:fuente:{f1}").items()}
    assert 1 <= int(fu["estrellas"]) <= 5 and json.loads(fu["motivos"])


def test_errores_en_espanol(v, proc, tmp_path):
    malo = tmp_path / "malo.xlsx"
    malo.write_bytes(b"esto no es un excel")
    r = subir(v, proc, malo)
    assert r["estado"] == "error" and r["mensaje"]
    vacio_ref = {"id": "t-x", "nombre": "x", "programa": "P", "unidad": "otra", "fecha_corte": "2026-09-30"}
    v.hset("eira:trabajo:t-x", mapping={"estado": "pendiente"})
    proc.procesar_trabajo(vacio_ref)
    assert v.hget("eira:trabajo:t-x", "estado") == b"error"
