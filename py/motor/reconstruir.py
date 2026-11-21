"""Reconstruye las claves eira:* de resultados desde SQLite.

Dos casos:

- Reintento tras una caida en la ventana SQLite-commit / EXEC: la fuente
  existe en SQLite pero falta eira:fuente:<id> -> reconstruir_fuente
  re-emite solo lo de esa fuente.
- Perdida de Valkey: `uv run python -m py.motor.reconstruir` borra las
  claves de resultados y las rehace todas desde SQLite.

No toca las colas (eira:trabajos, eira:decisiones), los trabajos
(eira:trabajo:*), los archivos crudos (eira:archivo:*) ni los eventos:
esas claves pertenecen al flujo, no a los resultados.
"""
import os
import sys
import time

from db import catalogo
from . import escribir

RESULTADOS_FIJAS = ("eira:fuentes", "eira:huellas:archivo", "eira:huellas:fila",
                    "eira:per:todas", "eira:nac", "eira:sinid", "eira:pares",
                    "eira:presencia:global", "eira:contrato")
RESULTADOS_PATRON = ("eira:fuente:*", "eira:anom:*", "eira:omitidas:*",
                     "eira:cnt:*", "eira:per:*", "eira:presencia:*",
                     "eira:valores:*")


def _cols(db, tabla: str) -> list[str]:
    return [d[0] for d in db.execute(
        f"SELECT * FROM {tabla} LIMIT 0").description]


def _pares_pendientes(db) -> dict[str, str]:
    """persona_b -> persona_a de los pares aun pendientes (cuentan como una)."""
    return {r[0]: r[1] for r in db.execute(
        "SELECT persona_b, persona_a FROM pares_persona WHERE estado='pendiente'")}


def _escribir_pares(db, pipe) -> int:
    cols = _cols(db, "pares_persona")
    n = 0
    for r in db.execute("SELECT * FROM pares_persona"):
        p = dict(zip(cols, r))
        lados = {}
        for lado, pid in (("a", p["persona_a"]), ("b", p["persona_b"])):
            i = db.execute(
                "SELECT etiqueta, fuente, fila FROM identidades"
                " WHERE persona_id=? LIMIT 1", (pid,)).fetchone()
            lados[lado] = {"etiqueta": i[0] if i else "",
                           "fuente": i[1] if i else "",
                           "fila": i[2] if i else 0}
        pipe.hset("eira:pares", p["id"], escribir._json({
            "id": p["id"], "estado": p["estado"], "motivo": p["motivo"],
            "a": lados["a"], "b": lados["b"]}))
        n += 1
    return n


def _omitidas_json(db, fid: str, regs: list[dict]) -> list[dict]:
    """Reconstruye eira:omitidas:<fid>: a que fila anterior estaba pegada
    cada fila omitida (misma huella, ya contada)."""
    res = []
    reglas = {r[0]: r[1] for r in db.execute(
        "SELECT fila, regla FROM anomalias WHERE fuente_id=? AND regla IN"
        " ('fila_repetida','fila_ya_cargada')", (fid,))}
    for r in regs:
        if r["contado"]:
            continue
        if reglas.get(r["fila"]) == "fila_repetida":
            prev = db.execute(
                "SELECT fuente_id, fila FROM registros WHERE huella_fila=?"
                " AND contado=1 AND fuente_id=? ORDER BY fila LIMIT 1",
                (r["huella_fila"], fid)).fetchone()
        else:
            prev = db.execute(
                "SELECT fuente_id, fila FROM registros WHERE huella_fila=?"
                " AND contado=1 ORDER BY fuente_id=?, fila LIMIT 1",
                (r["huella_fila"], fid)).fetchone()
        res.append({"fila": r["fila"],
                    "ya_en_fuente": prev[0] if prev else "",
                    "ya_en_fila": prev[1] if prev else 0})
    return res


def reconstruir_fuente(db, v, fid: str) -> bool:
    """Re-emite en Valkey todo lo que una fuente debio dejar. Devuelve
    False si la fuente no existe en SQLite."""
    fila_f = db.execute("SELECT * FROM fuentes WHERE id=?", (fid,)).fetchone()
    if fila_f is None:
        return False
    fu = dict(zip(_cols(db, "fuentes"), fila_f))
    ini = fu["iniciativa_id"]
    impactados = catalogo.roles_impactados()
    rep = _pares_pendientes(db)
    rcols = _cols(db, "registros")
    regs = [dict(zip(rcols, r)) for r in db.execute(
        "SELECT * FROM registros WHERE fuente_id=? ORDER BY fila", (fid,))]
    info_p = {r[0]: r for r in db.execute(
        "SELECT id, certeza, fecha_nacimiento FROM personas")}

    pipe = v.pipeline(transaction=True)
    pipe.zadd("eira:fuentes", {fid: int(time.time())})
    pipe.hset(f"eira:fuente:{fid}", mapping={
        "nombre": fu["nombre"], "programa": ini,
        "unidad": fu["tipo_registro"] or "",
        "fecha_corte": fu["fecha_corte"], "cargada_en": fu["cargada_en"],
        "por": fu["por"] or "", "filas": str(fu["filas"]),
        "filas_nuevas": str(fu["filas_nuevas"]),
        "filas_omitidas": str(fu["filas_omitidas"]),
        "inasistencias": str(fu["inasistencias"]),
        "estrellas": str(fu["estrellas"]), "puntaje": str(fu["puntaje"]),
        "motivos": fu["motivos"] or "[]"})
    pipe.delete(f"eira:anom:{fid}")
    for a in db.execute(
            "SELECT fila, regla, campo, detalle FROM anomalias"
            " WHERE fuente_id=? ORDER BY fila", (fid,)):
        pipe.rpush(f"eira:anom:{fid}", escribir._json(
            {"fila": a[0], "regla": a[1], "campo": a[2], "detalle": a[3]}))
    pipe.delete(f"eira:omitidas:{fid}")
    for o in _omitidas_json(db, fid, regs):
        pipe.rpush(f"eira:omitidas:{fid}", escribir._json(o))

    for r in regs:
        if not r["contado"]:
            continue
        campo = escribir.campo_conteo(ini, r["ciudad"] or "",
                                    r["periodo"] or "", r["servicio"] or "")
        pid = r["persona_id"]
        if pid:
            if (r["cantidad"] or 0) > 0:
                escribir._incr(pipe, f"eira:cnt:{r['tipo_registro']}",
                               campo, r["cantidad"])
                pid_set = rep.get(pid, pid)
                info = info_p.get(pid)
                claves = [f"eira:per:programa:{ini}"]
                if info:
                    claves.append(f"eira:per:certeza:{info[1]}")
                if r["rol_persona"] in impactados:
                    claves.append(f"eira:per:impactadas:{ini}")
                if r["rol_persona"] == "donante":
                    claves.append(f"eira:per:donantes:{ini}")
                for dim, val in (("ciudad", r["ciudad"]),
                                 ("periodo", r["periodo"]),
                                 ("servicio", r["servicio"])):
                    if val:
                        claves.append(f"eira:per:{dim}:{val}")
                for clave in claves:
                    pipe.sadd(clave, pid_set)
                pipe.sadd("eira:per:todas", pid_set)
                if info and info[2]:
                    pipe.hset("eira:nac", pid, info[2])
        elif (r["cantidad"] or 0) > 0:
            escribir._incr(pipe, "eira:sinid", campo, r["cantidad"])
        if r["municipio_clave"]:
            pipe.hincrby(f"eira:presencia:{ini}", r["municipio_clave"], 1)
            pipe.hincrby("eira:presencia:global", r["municipio_clave"], 1)

    pipe.sadd("eira:valores:programa", ini)
    for dim, col in (("ciudad", "ciudad"), ("periodo", "periodo"),
                     ("servicio", "servicio"), ("estado", "estado")):
        for val in {r[col] for r in regs if r[col]}:
            pipe.sadd(f"eira:valores:{dim}", val)

    _escribir_pares(db, pipe)

    # Huellas de fila con hsetnx: la fuente que las reclamo primero gana.
    pipe.hset(escribir.H_ARCHIVO, fu["huella_bytes"], fid)
    for r in regs:
        if r["contado"]:
            pipe.hsetnx(escribir.H_FILA, r["huella_fila"],
                        f"{fid}:{r['fila']}")
    pipe.set("eira:contrato", "1", nx=True)
    pipe.execute()
    return True


def reconstruir_todo(db, v) -> dict:
    """Borra las claves eira:* de resultados y las rehace desde SQLite."""
    for patron in RESULTADOS_PATRON:
        for k in v.scan_iter(patron):
            v.delete(k)
    for k in RESULTADOS_FIJAS:
        v.delete(k)
    fids = [r[0] for r in db.execute(
        "SELECT id FROM fuentes ORDER BY cargada_en, id")]
    for fid in fids:
        reconstruir_fuente(db, v, fid)
    v.set("eira:contrato", "1", nx=True)
    v.xadd("eira:bitacora", {
        "en": escribir.ahora(), "por": "motor", "tipo": "reconstruir",
        "detalle": f"Se reconstruyeron las claves de {len(fids)} fuentes"
                   " desde SQLite."})
    return {"fuentes": len(fids)}


def main() -> None:
    from db.crear import crear
    from .worker import conectar
    v = conectar()
    db = crear(os.environ.get("IMPACTO_DB", "data/impacto.sqlite"))
    res = reconstruir_todo(db, v)
    print(f"[reconstruir] {res['fuentes']} fuentes reconstruidas desde"
          " SQLite.", flush=True)


if __name__ == "__main__":
    sys.exit(main() or 0)
