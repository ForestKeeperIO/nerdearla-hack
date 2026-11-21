"""Trabajador del motor EIRA.

Ciclo XREADGROUP sobre eira:trabajos y eira:decisiones (grupo "procesadores").
Un trabajo a la vez. Todo se configura por variables de entorno:

    VALKEY_URL       (incluye el numero de base: redis://127.0.0.1:6379/0)
    VALKEY_PASSWORD  (opcional)
    IMPACTO_DB       (ruta del archivo SQLite; se crea si no existe)
    IMPACTO_HMAC_KEY (clave de las huellas y seudonimos)

Uso: uv run python -m py.motor.worker
"""
import json
import os
import sqlite3
import sys
import time
import uuid
from datetime import date

import pandas as pd
import valkey

from db import catalogo
from db.crear import crear
from . import escribir, huellas, leer, personas, reconstruir

GRUPO = "procesadores"
CONSUMIDOR = f"py-{os.getpid()}"

PESOS_ANOMALIA = {"faltante": 2, "fecha_invalida": 3, "fecha_futura": 3,
                  "ciudad_desconocida": 3, "id_invalido": 3, "edad_inconsistente": 2,
                  "fila_repetida": 1, "fila_ya_cargada": 1, "posible_correccion": 1,
                  "tipo_desconocido": 2}


def conectar(texto: bool = True) -> valkey.Valkey:
    """Cliente de Valkey. texto=False devuelve respuestas en bytes (para
    eira:archivo:*, que trae el Excel crudo)."""
    return valkey.Valkey.from_url(
        os.environ.get("VALKEY_URL", "redis://127.0.0.1:6379"),
        password=os.environ.get("VALKEY_PASSWORD") or None,
        decode_responses=texto, socket_timeout=15)


def asegurar_grupos(v) -> None:
    for stream in ("eira:trabajos", "eira:decisiones"):
        try:
            v.xgroup_create(stream, GRUPO, id="0", mkstream=True)
        except valkey.ResponseError:
            pass


def encolar(v, contenido: bytes, nombre: str, programa: str, unidad: str,
            fecha_corte: str, por: str = "local", estado_clave: str = "14") -> str:
    """Encola un archivo igual que lo hace el frontend. Devuelve el trabajo_id."""
    trabajo_id = "tr-" + uuid.uuid4().hex[:10]
    v.set(f"eira:archivo:{trabajo_id}", contenido, ex=3600)
    v.hset(f"eira:trabajo:{trabajo_id}", mapping={
        "estado": "pendiente", "nombre": nombre, "programa": programa,
        "unidad": unidad, "fecha_corte": fecha_corte, "por": por,
        "estado_clave": estado_clave, "creado_en": escribir.ahora()})
    v.xadd("eira:trabajos", {"id": trabajo_id, "nombre": nombre, "programa": programa,
                            "unidad": unidad, "fecha_corte": fecha_corte, "por": por,
                            "estado_clave": estado_clave})
    return trabajo_id


def _calidad(anomalias: list[dict], filas: int, omitidas: int, inasistencias: int,
             sin_id: int) -> tuple[int, float, list[str]]:
    puntaje = 100.0 - sum(PESOS_ANOMALIA.get(a["regla"], 1) for a in anomalias)
    puntaje = max(0.0, puntaje)
    estrellas = max(1, min(5, round(puntaje / 20)))
    motivos = []
    if sin_id:
        motivos.append(f"{sin_id} registros sin ID de EIRA (persona por nombre)")
    if omitidas:
        motivos.append(f"{omitidas} filas omitidas porque ya estaban registradas")
    n = len(anomalias)
    if n:
        motivos.append(f"{n} anotaciones de calidad")
    if inasistencias:
        motivos.append(f"{inasistencias} inasistencias registradas")
    if not motivos:
        motivos.append("Datos completos y consistentes")
    return estrellas, puntaje, motivos


def _edad_inconsistente(fila) -> bool:
    if not fila.id_eira or fila.edad is None:
        return False
    try:
        nac = date(int(fila.id_eira[3:7]), int(fila.id_eira[7:9]), int(fila.id_eira[9:11]))
        en = date.fromisoformat(fila.fecha) if fila.fecha else date.today()
        return abs(fila.edad - (en - nac).days // 365) > 1
    except ValueError:
        return False


def procesar_trabajo(v, db: sqlite3.Connection, trabajo_id: str,
                     campos: dict | None = None, vb=None) -> dict:
    campos = campos or v.hgetall(f"eira:trabajo:{trabajo_id}")
    nombre = campos.get("nombre", trabajo_id)
    v.hset(f"eira:trabajo:{trabajo_id}", "estado", "procesando")
    try:
        contenido = (vb or v).get(f"eira:archivo:{trabajo_id}")
        if isinstance(contenido, str):
            contenido = contenido.encode("latin-1")
        if contenido is None:
            raise RuntimeError("No encontré el archivo: expiró o no se subió.")

        ini = catalogo.iniciativa(campos.get("programa", ""))
        if ini is None:
            raise RuntimeError(
                f"No reconozco el programa '{campos.get('programa', '')}': "
                "no está en el catálogo de iniciativas.")

        df, anomalias = leer.leer_reporte(
            contenido, nombre, estado_clave=campos.get("estado_clave") or "14")
        df = df.astype("object").where(pd.notna(df), None)  # NaN -> None
        sin_personas = bool(df.attrs.get("sin_personas"))
        fecha_corte = campos.get("fecha_corte", "")

        # Tipo de registro y rol por fila: la columna Tipo decide cuando el
        # trabajo viene "segun_fila"; si no, manda la unidad del trabajo.
        unidad_trabajo = campos.get("unidad", "") or ""
        tipos, roles = [], []
        for r in df.itertuples(index=False):
            tipo, seguro = catalogo.resolver_tipo(ini, r.tipo_texto or "",
                                                  unidad_trabajo)
            if not seguro:
                anomalias.append({"fila": int(r.fila), "regla": "tipo_desconocido",
                                  "campo": "tipo",
                                  "detalle": "No reconocí el tipo de registro de la fila"})
            tipos.append(tipo)
            roles.append(catalogo.rol_de(ini, tipo))
        df["tipo_registro"] = tipos
        df["rol_persona"] = roles

        clave = huellas.clave_hmac()
        df["huella_fila"] = [huellas.huella_fila(r, clave)
                             for r in df.to_dict("records")]
        hb = huellas.huella_bytes(contenido)
        veredicto = huellas.evaluar(v, hb, list(df["huella_fila"]))
        veredicto["huella_bytes"] = hb

        if veredicto["nivel"] in ("identico", "mismo_contenido"):
            escribir.registrar_duplicado(v, trabajo_id, veredicto, nombre,
                                         len(df), df.attrs.get("mapeo", []))
            return v.hgetall(f"eira:trabajo:{trabajo_id}")

        # --- deduplicacion por fila: global (Valkey) y dentro del archivo -----
        fid = escribir.fuente_id_de(hb)
        unicas = list(dict.fromkeys(df["huella_fila"]))
        dueños = ({h: d for h, d in zip(unicas, v.hmget(huellas.H_FILA, unicas)) if d}
                  if unicas else {})
        local: dict[str, int] = {}
        contados, omitidas_fuente, omitidas_fila = [], [], []
        for r in df.itertuples(index=False):
            h = r.huella_fila
            if h in dueños:
                contados.append(0)
                f, n = dueños[h].split(":")
                omitidas_fuente.append(f)
                omitidas_fila.append(int(n))
                anomalias.append({"fila": int(r.fila), "regla": "fila_ya_cargada",
                                  "campo": "", "detalle": "La fila ya estaba en otro reporte"})
            elif h in local:
                contados.append(0)
                omitidas_fuente.append(fid)
                omitidas_fila.append(local[h])
                anomalias.append({"fila": int(r.fila), "regla": "fila_repetida",
                                  "campo": "", "detalle": "Fila idéntica a otra dentro del mismo archivo"})
            else:
                contados.append(1)
                local[h] = int(r.fila)
                omitidas_fuente.append("")
                omitidas_fila.append(0)
        df["contado"] = contados
        df["ya_en_fuente"] = omitidas_fuente
        df["ya_en_fila"] = omitidas_fila

        # Anomalias que dependen de la fecha de corte y de la edad del ID.
        for r in df.itertuples(index=False):
            if r.fecha and fecha_corte and r.fecha > fecha_corte:
                anomalias.append({"fila": int(r.fila), "regla": "fecha_futura",
                                  "campo": "fecha",
                                  "detalle": "La fecha es posterior al corte del reporte"})
            if _edad_inconsistente(r):
                anomalias.append({"fila": int(r.fila), "regla": "edad_inconsistente",
                                  "campo": "edad",
                                  "detalle": "La edad no coincide con la fecha del ID"})

        # --- personas ---------------------------------------------------------
        vinculacion = None
        if sin_personas:
            df["persona_id"] = None
            df["certeza"] = ""
            df["nacimiento"] = ""
        else:
            existentes = pd.read_sql_query("SELECT * FROM identidades", db)
            contadas = df[df["contado"] == 1]
            vinculacion = personas.vincular(contadas, existentes, fuente_id=fid)
            df["persona_id"] = vinculacion.persona_ids.reindex(df.index)
            df["persona_id"] = df["persona_id"].where(df["persona_id"].notna(), None)
            nac_map = {p["id"]: p for p in vinculacion.personas_nuevas}
            viejas = pd.read_sql_query("SELECT * FROM personas", db)
            info = {p.id: p for p in viejas.itertuples(index=False)}
            certezas, nacs = [], []
            for pid in df["persona_id"]:
                if pid is None or (isinstance(pid, float) and pd.isna(pid)):
                    certezas.append("")
                    nacs.append("")
                elif pid in nac_map:
                    certezas.append(nac_map[pid]["certeza"])
                    nacs.append(nac_map[pid]["fecha_nacimiento"] or "")
                elif pid in info:
                    certezas.append(info[pid].certeza)
                    nacs.append(info[pid].fecha_nacimiento or "")
                else:
                    certezas.append("")
                    nacs.append("")
            df["certeza"] = certezas
            df["nacimiento"] = nacs

        pares = vinculacion.pares if vinculacion else []

        filas = len(df)
        filas_nuevas = int(df["contado"].sum())
        filas_omitidas = filas - filas_nuevas
        filas_repetidas = sum(1 for a in anomalias if a["regla"] == "fila_repetida")
        inasistencias = int((df["asistio"] == False).sum())  # noqa: E712
        sin_id = int(((df["persona_id"].isna()) & (df["contado"] == 1)).sum())
        estrellas, puntaje, motivos = _calidad(anomalias, filas, filas_omitidas,
                                               inasistencias, sin_id)

        fuente = {"id": fid, "nombre": nombre, "iniciativa_id": ini["id"],
                  "unidad": unidad_trabajo,
                  "fecha_corte": fecha_corte, "por": campos.get("por", ""),
                  "filas": filas, "filas_nuevas": filas_nuevas,
                  "filas_omitidas": filas_omitidas, "inasistencias": inasistencias,
                  "estrellas": estrellas, "puntaje": puntaje, "motivos": motivos,
                  "huella_bytes": hb}

        previa = db.execute("SELECT id FROM fuentes WHERE huella_bytes=?",
                            (hb,)).fetchone()
        if previa:
            return _resolver_previa(v, db, trabajo_id, veredicto, nombre,
                                    filas, df.attrs.get("mapeo", []), previa[0])

        try:
            escribir.guardar(db, v, fuente, df, anomalias, pares, veredicto, vinculacion)
        except sqlite3.IntegrityError:
            # La fuente ya existia (carrera con otro worker o una caida a
            # medias): el UNIQUE de huella_bytes la delata. Si su mitad de
            # Valkey falta se re-emite; un IntegrityError de otra cosa es un
            # error genuino y sube.
            if db.execute("SELECT 1 FROM fuentes WHERE huella_bytes=?",
                          (hb,)).fetchone() is None:
                raise
            return _resolver_previa(v, db, trabajo_id, veredicto, nombre,
                                    filas, df.attrs.get("mapeo", []), fid)

        mensaje = veredicto["mensaje"]
        if filas_repetidas:
            mensaje += f" {filas_repetidas} filas repetidas dentro del archivo: se cuentan una vez."
        if sin_personas:
            mensaje = ("Este reporte no trae identificador de persona: "
                       "se cuenta por filas. " + mensaje)
        v.hset(f"eira:trabajo:{trabajo_id}", mapping={
            "estado": "listo", "mensaje": mensaje,
            "nivel_duplicado": veredicto["nivel"], "fuente": fid,
            "fuente_original": veredicto["fuente_original"],
            "filas": str(filas), "filas_nuevas": str(filas_nuevas),
            "filas_omitidas": str(filas_omitidas),
            "filas_repetidas": str(filas_repetidas),
            "mapeo": json.dumps(df.attrs.get("mapeo", []), ensure_ascii=False),
            "terminado_en": escribir.ahora()})
        v.publish("eira:eventos", json.dumps({"tipo": "trabajo", "id": trabajo_id}))
        return v.hgetall(f"eira:trabajo:{trabajo_id}")
    except Exception as e:  # noqa: BLE001 - el estado del trabajo lo refleja
        v.hset(f"eira:trabajo:{trabajo_id}", mapping={
            "estado": "error", "mensaje": f"No pude procesarlo: {e}",
            "terminado_en": escribir.ahora()})
        v.publish("eira:eventos", json.dumps({"tipo": "trabajo", "id": trabajo_id}))
        raise


def _resolver_previa(v, db, trabajo_id: str, veredicto: dict, nombre: str,
                     filas: int, mapeo: list, fid_prev: str) -> dict:
    """La fuente ya esta en SQLite. Si su mitad de Valkey falta (EXEC
    perdido tras una caida) se re-emite desde SQLite y el trabajo queda
    listo; si esta completa es un duplicado normal."""
    if not v.exists(f"eira:fuente:{fid_prev}"):
        reconstruir.reconstruir_fuente(db, v, fid_prev)
        v.hset(f"eira:trabajo:{trabajo_id}", mapping={
            "estado": "listo",
            "mensaje": "Este archivo ya estaba registrado; volví a publicar "
                       "sus cifras en el tablero.",
            "nivel_duplicado": "identico", "fuente": fid_prev,
            "fuente_original": fid_prev, "filas": str(filas),
            "filas_nuevas": "0", "filas_omitidas": str(filas),
            "filas_repetidas": "0", "mapeo": json.dumps(
                mapeo, ensure_ascii=False),
            "terminado_en": escribir.ahora()})
        v.xadd("eira:bitacora", {
            "en": escribir.ahora(), "por": "motor", "tipo": "reconstruir",
            "detalle": f"Se re-emitieron las claves de '{nombre}'"
                       f" ({fid_prev}) desde SQLite."})
        v.publish("eira:eventos", json.dumps({"tipo": "trabajo", "id": trabajo_id}))
        return v.hgetall(f"eira:trabajo:{trabajo_id}")
    veredicto.update(nivel="identico", fuente_original=fid_prev, mensaje=(
        f"Este archivo ya se cargó antes como '{nombre}'. No se vuelve a cargar."))
    escribir.registrar_duplicado(v, trabajo_id, veredicto, nombre, filas, mapeo)
    return v.hgetall(f"eira:trabajo:{trabajo_id}")


# --- Decisiones humanas ---------------------------------------------------------

def _membresias(db, pid: str) -> set[str]:
    """Claves eira:per:* donde una persona aparece por sus registros
    contados (cantidad > 0)."""
    impactados = catalogo.roles_impactados()
    claves = {"eira:per:todas"}
    for ini, ciu, per, ser, rol in db.execute(
            "SELECT DISTINCT iniciativa_id, ciudad, periodo, servicio,"
            " rol_persona FROM registros"
            " WHERE persona_id=? AND contado=1 AND cantidad>0", (pid,)):
        claves.add(f"eira:per:programa:{ini}")
        if ciu:
            claves.add(f"eira:per:ciudad:{ciu}")
        if per:
            claves.add(f"eira:per:periodo:{per}")
        if ser:
            claves.add(f"eira:per:servicio:{ser}")
        if rol in impactados:
            claves.add(f"eira:per:impactadas:{ini}")
        if rol == "donante":
            claves.add(f"eira:per:donantes:{ini}")
    c = db.execute("SELECT certeza FROM personas WHERE id=?",
                   (pid,)).fetchone()
    if c:
        claves.add(f"eira:per:certeza:{c[0]}")
    return claves


def _decidir_par(v, db, par: str, decision: str, por: str) -> None:
    fila = db.execute("SELECT * FROM pares_persona WHERE id=?", (par,)).fetchone()
    if fila is None:
        return
    pendiente = fila[5] == "pendiente"  # columna estado
    if not pendiente and fila[5] != decision:
        return  # ya se decidio otra cosa: no se pisa
    en = escribir.ahora()
    a, b = fila[1], fila[2]
    sets_b = _membresias(db, b)  # antes de mover registros
    if pendiente:
        with db:
            db.execute("UPDATE pares_persona SET estado=?, decidido_por=?,"
                       " decidido_en=? WHERE id=?", (decision, por, en, par))
            if decision == "misma":
                db.execute("UPDATE registros SET persona_id=?"
                           " WHERE persona_id=?", (a, b))
                # Reasignar identidades en vez de borrarlas: una carga
                # posterior con ese ID y nombre cae en a. OR IGNORE por si
                # la pareja (clave, nombre_clave) ya apunta a a.
                db.execute("UPDATE OR IGNORE identidades SET persona_id=?"
                           " WHERE persona_id=?", (a, b))
                db.execute("DELETE FROM identidades WHERE persona_id=?", (b,))
                db.execute("DELETE FROM personas WHERE id=?", (b,))
            db.execute("INSERT INTO bitacora(en, por, tipo, detalle)"
                       " VALUES (?,?,?,?)",
                       (en, por or "presidencia", "decision",
                        f"Par {par}: se marcó como '{decision}'."))

    crudo = v.hget("eira:pares", par)
    if crudo:
        d = json.loads(crudo)
        d["estado"] = decision
        v.hset("eira:pares", par, json.dumps(d, ensure_ascii=False))

    # Valkey es idempotente: reaplicar repara una caida a media decision.
    pipe = v.pipeline()
    if decision == "misma":
        # b sale de los conjuntos; a la representa donde ella tenia filas.
        for clave in sets_b:
            pipe.srem(clave, b)
            pipe.sadd(clave, a)
        nac_b = v.hget("eira:nac", b)
        pipe.hdel("eira:nac", b)
        if nac_b and not v.hget("eira:nac", a):
            pipe.hset("eira:nac", a, nac_b)
    elif decision == "distinta":
        # b vuelve a contar como persona propia donde tenga filas.
        for clave in sets_b:
            pipe.sadd(clave, b)
    pipe.xadd("eira:bitacora", {"en": en, "por": por or "presidencia",
                              "tipo": "decision",
                              "detalle": f"Par {par}: '{decision}'."})
    pipe.execute()
    v.publish("eira:eventos", json.dumps({"tipo": "persona", "id": par}))


def _restituir_fila(v, db, fuente_id: str, num_fila: int, por: str) -> None:
    reg = db.execute(
        "SELECT * FROM registros WHERE fuente_id=? AND fila=? AND contado=0",
        (fuente_id, num_fila)).fetchone()
    if reg is None:
        return
    cols = [d[0] for d in db.execute("SELECT * FROM registros LIMIT 0").description]
    r = dict(zip(cols, reg))
    cant = float(r["cantidad"] or 0)
    en = escribir.ahora()
    with db:
        # La cantidad real de la fila ya esta guardada; solo se marca contada.
        db.execute("UPDATE registros SET contado=1 WHERE id=?", (r["id"],))
        db.execute("UPDATE fuentes SET filas_omitidas=MAX(filas_omitidas-1,0),"
                   " filas_nuevas=filas_nuevas+1 WHERE id=?", (fuente_id,))
        db.execute("INSERT INTO bitacora(en, por, tipo, detalle) VALUES (?,?,?,?)",
                   (en, por or "presidencia", "restituir_fila",
                    f"Fila {num_fila} de '{fuente_id}' se cuenta de todos modos."))
    # Quitar de la lista de omitidas y sumarla.
    for item in v.lrange(f"eira:omitidas:{fuente_id}", 0, -1):
        if json.loads(item).get("fila") == num_fila:
            v.lrem(f"eira:omitidas:{fuente_id}", 1, item)
    ini = r["iniciativa_id"]
    campo = escribir.campo_conteo(ini, r["ciudad"] or "",
                                  r["periodo"] or "", r["servicio"] or "")
    pipe = v.pipeline()
    pipe.hincrby(f"eira:fuente:{fuente_id}", "filas_omitidas", -1)
    pipe.hincrby(f"eira:fuente:{fuente_id}", "filas_nuevas", 1)
    if r["persona_id"]:
        if cant > 0:
            escribir._incr(pipe, f"eira:cnt:{r['tipo_registro']}", campo, cant)
        rol = r["rol_persona"] or ""
        impactados = catalogo.roles_impactados()
        for clave in (f"eira:per:programa:{ini}",
                      f"eira:per:impactadas:{ini}" if rol in impactados else None,
                      f"eira:per:donantes:{ini}" if rol == "donante" else None,
                      f"eira:per:ciudad:{r['ciudad']}" if r["ciudad"] else None,
                      f"eira:per:periodo:{r['periodo']}" if r["periodo"] else None,
                      f"eira:per:servicio:{r['servicio']}" if r["servicio"] else None):
            if clave:
                pipe.sadd(clave, r["persona_id"])
        pipe.sadd("eira:per:todas", r["persona_id"])
    elif cant > 0:
        escribir._incr(pipe, "eira:sinid", campo, cant)
    if r["municipio_clave"]:
        pipe.hincrby(f"eira:presencia:{ini}", r["municipio_clave"], 1)
        pipe.hincrby("eira:presencia:global", r["municipio_clave"], 1)
    pipe.xadd("eira:bitacora", {"en": en, "por": por or "presidencia",
                              "tipo": "restituir_fila",
                              "detalle": f"Fila {num_fila} de '{fuente_id}' restituida."})
    pipe.execute()
    v.publish("eira:eventos", json.dumps({"tipo": "fuente", "id": fuente_id}))


def aplicar_decision(v, db, campos: dict) -> None:
    tipo = campos.get("tipo", "")
    if tipo == "persona":
        _decidir_par(v, db, campos.get("par", ""), campos.get("decision", ""),
                     campos.get("por", ""))
    elif tipo == "restituir_fila":
        _restituir_fila(v, db, campos.get("fuente", ""), int(campos.get("fila", 0)),
                        campos.get("por", ""))


# --- Ciclo principal -----------------------------------------------------------

MAX_ENTREGAS = 3
_ENTREGAS: dict[str, int] = {}


def _manejar(v, db, stream: str, msg_id: str, campos: dict, vb=None) -> None:
    """Procesa un mensaje del grupo. XACK solo tras exito o tras
    MAX_ENTREGAS intentos (en ese caso el trabajo queda en error)."""
    try:
        if stream == "eira:trabajos":
            procesar_trabajo(v, db, campos["id"], campos, vb=vb)
        else:
            aplicar_decision(v, db, campos)
    except Exception as e:  # noqa: BLE001 - se reintenta o se rinde
        n = _ENTREGAS[msg_id] = _ENTREGAS.get(msg_id, 0) + 1
        print(f"[worker] error en {stream} {msg_id} (entrega {n}): {e}",
              file=sys.stderr)
        if n >= MAX_ENTREGAS:
            if stream == "eira:trabajos":
                v.hset(f"eira:trabajo:{campos['id']}", mapping={
                    "estado": "error",
                    "mensaje": "No pude procesarlo tras varios intentos. "
                               "Avísanos para revisarlo.",
                    "terminado_en": escribir.ahora()})
                v.publish("eira:eventos", json.dumps(
                    {"tipo": "trabajo", "id": campos["id"]}))
            _ENTREGAS.pop(msg_id, None)
            v.xack(stream, GRUPO, msg_id)
        return
    _ENTREGAS.pop(msg_id, None)
    v.xack(stream, GRUPO, msg_id)


def reclamar_pendientes(v, db, vb=None, min_idle_ms: int = 0) -> int:
    """XAUTOCLAIM de los pendientes del grupo y los procesa.

    Se llama al arrancar (un consumidor que murio deja sus mensajes
    pendientes) y de vez en cuando en el ciclo. Devuelve cuantos tomo.
    """
    tomados = 0
    for stream in ("eira:trabajos", "eira:decisiones"):
        inicio = "0-0"
        while True:
            try:
                inicio, mensajes, _ = v.xautoclaim(
                    stream, GRUPO, CONSUMIDOR, min_idle_time=min_idle_ms,
                    start_id=inicio, count=20)
            except (TimeoutError, valkey.exceptions.TimeoutError):
                break
            for msg_id, campos in mensajes:
                if campos is None:  # entrada hueca: el mensaje ya no existe
                    v.xack(stream, GRUPO, msg_id)
                    continue
                tomados += 1
                _manejar(v, db, stream, msg_id, campos, vb=vb)
            if inicio == "0-0" or not mensajes:
                break
    return tomados


def ciclo(v, db, bloque_ms: int = 5000, vb=None) -> None:
    vb = vb or conectar(texto=False)
    try:
        resp = v.xreadgroup(GRUPO, CONSUMIDOR,
                            {"eira:trabajos": ">", "eira:decisiones": ">"},
                            count=4, block=bloque_ms)
    except (TimeoutError, valkey.exceptions.TimeoutError):
        return  # sin mensajes en el bloqueo: vuelve a intentar
    for stream, mensajes in resp or []:
        for msg_id, campos in mensajes:
            _manejar(v, db, stream, msg_id, campos, vb=vb)


def main() -> None:
    try:
        huellas.clave_hmac()
    except RuntimeError as e:
        print(f"[worker] {e}", file=sys.stderr)
        sys.exit(2)
    v = conectar()
    db = crear(os.environ.get("IMPACTO_DB", "data/impacto.sqlite"))
    db.row_factory = None
    asegurar_grupos(v)
    vb = conectar(texto=False)
    reclamar_pendientes(v, db, vb=vb, min_idle_ms=0)
    print("[worker] escuchando eira:trabajos y eira:decisiones …", flush=True)
    while True:
        ciclo(v, db, vb=vb)
        reclamar_pendientes(v, db, vb=vb, min_idle_ms=30_000)


if __name__ == "__main__":
    main()
