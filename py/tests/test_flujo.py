"""Flujo completo contra Valkey: archivos sintéticos → contrato."""
import json
import uuid

def _identidades():
    import random

    import generar
    rng = random.Random(0)
    ps = [generar.persona(i, rng) for i in range(150)]
    return [p["nombre"] for p in ps] + ["María Elena Landa Mora"], [p["id"] for p in ps]


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

    # Traslape parcial: nutricion.xlsx también es de Tamizaje Rosa y comparte 30 filas
    r = subir(v, proc, d / "nutricion.xlsx", "Tamizaje Rosa")
    assert r["nivel_duplicado"] == "traslape_parcial" and int(r["filas_omitidas"]) == 30 and int(r["filas_nuevas"]) == 40, r

    # Segundo programa: Melenas en Movimiento, un archivo con dos tipos de registro por fila
    r = subir(v, proc, d / "melenas-en-movimiento.xlsx", "Melenas en Movimiento", "donacion")
    assert r["estado"] == "listo" and int(r["filas_nuevas"]) == 60, r
    assert "tipo_registro" in {m["campo"] for m in json.loads(r["mapeo"])}

    # Personas únicas con un solo identificador; los programas se identifican por id del catálogo
    T, M = "eira:per:programa:tamizaje-rosa", "eira:per:programa:melenas-en-movimiento"
    assert v.scard(M) == esp["beneficiarias_melenas"]            # las donantes NO son personas impactadas
    assert v.scard("eira:don:programa:melenas-en-movimiento") == esp["donantes_melenas"]
    assert v.sintercard(2, [T, M]) == esp["en_mas_de_un_programa"]
    todas = v.scard("eira:per:todas")
    assert todas == v.scard("eira:per:certeza:id") + v.scard("eira:per:certeza:folio")
    # Cada tipo de registro en su propia clave; objetos (trenzas) se suman por cantidad
    assert sum(int(x) for x in v.hvals("eira:cnt:donacion")) == 20 * 1 + 20 * 2
    assert sum(int(x) for x in v.hvals("eira:cnt:producto_entregado")) == 20
    assert v.exists("eira:cnt:atencion") and not v.exists("eira:cnt:participacion")

    # Métricas por informe: programa y Global (suma de programas)
    mt = {k.decode(): x.decode() for k, x in v.hgetall("eira:met:tamizaje-rosa").items()}
    mm = {k.decode(): x.decode() for k, x in v.hgetall("eira:met:melenas-en-movimiento").items()}
    mg = {k.decode(): x.decode() for k, x in v.hgetall("eira:met:global").items()}
    assert int(mt["personas"]) == v.scard(T) and int(mm["personas"]) == 20 and int(mm["donantes"]) == 40
    assert int(mg["personas"]) == int(mt["personas"]) + int(mm["personas"])          # quien está en dos cuenta dos veces
    assert int(mg["personas_en_mas_de_un_programa"]) == esp["en_mas_de_un_programa"]
    assert int(mg["personas_unicas_en_total"]) == int(mg["personas"]) - esp["en_mas_de_un_programa"]
    assert json.loads(mg["programas"]) == ["melenas-en-movimiento", "tamizaje-rosa"]
    assert 25 <= float(mt["edad_promedio"]) <= 65 and int(mt["edad_n"]) > 0

    # Pares: mismo ID con nombres distintos esperan decisión y mientras tanto cuentan como una persona
    pares = {k.decode(): json.loads(x) for k, x in v.hgetall("eira:pares").items()}
    assert len(pares) == 2 and all(p["estado"] == "pendiente" for p in pares.values())
    assert {p["motivo"] for p in pares.values()} == {"Mismo ID, nombres distintos", "Posible variante de escritura"}
    antes_global = int(v.hget("eira:met:global", "personas"))
    antes = v.scard("eira:per:todas")
    par = next(iter(pares))
    proc.aplicar_decision({"tipo": "persona", "par": par, "decision": "distinta", "por": "prueba"})
    assert v.scard("eira:per:todas") == antes + 1
    # Separar a una persona que estaba en dos programas: la suma del Global no cambia,
    # pero ya no cuenta como "en más de un programa" y las personas únicas suben una.
    assert int(v.hget("eira:met:global", "personas")) == antes_global
    assert int(v.hget("eira:met:global", "personas_en_mas_de_un_programa")) == esp["en_mas_de_un_programa"] - 1
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
        if k.startswith(b"eira:archivo:"):  # el archivo crudo lo guarda el frontend y caduca en 1 h
            continue
        t = v.type(k).decode()
        vol += {"string": lambda: v.get(k) or b"", "hash": lambda: str(v.hgetall(k)).encode(),
                "list": lambda: str(v.lrange(k, 0, -1)).encode(), "set": lambda: str(v.smembers(k)).encode(),
                "zset": lambda: str(v.zrange(k, 0, -1)).encode(), "stream": lambda: str(v.xrange(k)).encode()}.get(t, lambda: b"")()
    vol = vol.decode(errors="ignore")
    nombres, ids = _identidades()
    assert not [n for n in nombres if n in vol], [n for n in nombres if n in vol][:3]
    assert not any(i in vol for i in ids), "hay un ID de EIRA en claro en Valkey"
    assert v.xlen("eira:bitacora") > 0
    fu = {k.decode(): x.decode() for k, x in v.hgetall(f"eira:fuente:{f1}").items()}
    assert 1 <= int(fu["estrellas"]) <= 5 and json.loads(fu["motivos"])


def test_errores_en_espanol(v, proc, tmp_path):
    malo = tmp_path / "malo.xlsx"
    malo.write_bytes(b"esto no es un excel")
    r = subir(v, proc, malo)
    assert r["estado"] == "error" and r["mensaje"]
    vacio_ref = {"id": "t-x", "nombre": "x", "programa": "Tamizaje Rosa", "unidad": "otra", "fecha_corte": "2026-09-30"}
    v.hset("eira:trabajo:t-x", mapping={"estado": "pendiente"})
    proc.procesar_trabajo(vacio_ref)
    assert v.hget("eira:trabajo:t-x", "estado") == b"error"


def test_programa_y_tipo_salen_del_catalogo(v, proc, archivos):
    d, _ = archivos
    r = subir(v, proc, d / "tamizaje-rosa.xlsx", "Programa Inventado")
    assert r["estado"] == "error" and "catálogo" in r["mensaje"]
    r = subir(v, proc, d / "melenas-en-movimiento.xlsx", "Melenas en Movimiento", "atencion")
    assert r["estado"] == "error" and "no admite" in r["mensaje"]
    assert v.zcard("eira:fuentes") == 0
