"""Actualiza la base de Metabase sin darle acceso a filas.nombre_norm ni a la llave."""
import argparse
import json
import os
import sqlite3
import time
from collections import Counter
from pathlib import Path

import valkey

from db import catalogo

VISTAS = ("v_personas_por_programa", "v_global", "v_conteos", "v_objetos",
          "v_edad", "v_cruce_programas", "v_presencia", "v_presencia_municipios",
          "v_calidad", "v_pares_pendientes")
MARCA = 0x45495241
ATLAS = {"atlas_registros": "v_registros_ef", "atlas_edades": "v_edad",
         "atlas_municipios": "municipios", "atlas_roles": "roles_de_persona",
         "atlas_iniciativas": "iniciativas", "atlas_fuentes": "fuentes",
         "atlas_tipos": "tipos_de_registro", "atlas_pares": "pares_persona", "atlas_revision": "bitacora",
         "atlas_pendientes": "v_pares_pendientes"}


def preparar(origen):
    origen.execute("CREATE TEMP TABLE tipos(programa, tipo, impactada, objetos, PRIMARY KEY(programa,tipo))")
    origen.execute("CREATE TEMP TABLE lugares(fuente, ciudad, clave, municipio, estado, "
                   "municipios_del_estado, PRIMARY KEY(fuente,ciudad))")
    ruta = os.getenv("EIRA_CATALOGO") or Path(os.environ["SELMA_PY"]).parent / "catalogos/iniciativas.json"
    cat = json.loads(Path(ruta).read_text())
    origen.execute("CREATE TEMP TABLE atlas_iniciativas(id, nombre, clase)")
    origen.executemany("INSERT INTO atlas_iniciativas VALUES(?,?,?)",
                       ((p["id"], p["nombre"], p["clase"]) for p in cat["iniciativas"]))
    origen.execute("CREATE TEMP TABLE atlas_tipos(clave, plural)")
    origen.executemany("INSERT INTO atlas_tipos VALUES(?,?)",
                       ((t["clave"], t["plural"]) for t in cat["tipos_de_registro"]))
    origen.execute("CREATE TEMP TABLE atlas_revision(id)")
    objetos = {t["clave"] for t in cat["tipos_de_registro"] if t["se_cuenta"] == "objetos"}
    roles = {r["clave"] for r in cat["roles_de_persona"] if r["cuenta_como_impactada"]}
    origen.executemany("INSERT INTO tipos VALUES(?,?,?,?)", (
        (p["id"], t, catalogo.rol_de(p, t) in roles, t in objetos)
        for p in cat["iniciativas"] for t in p["tipos_de_registro"]))
    origen.executescript(Path(__file__).with_name("selma_vistas.sql").read_text())


def geografia(origen, v):
    # Selma conserva la ciudad, pero en este tip el estado INEGI queda solo en el trabajo.
    fuentes = origen.execute("SELECT id, trabajo FROM fuentes").fetchall()
    pipe = v.pipeline(transaction=False)
    for _, trabajo in fuentes:
        pipe.hget(f"eira:trabajo:{trabajo}", "estado_clave")
    estados = dict(zip((f for f, _ in fuentes), pipe.execute(), strict=True))
    totales = Counter(m["estado_clave"] for m in catalogo.municipios())
    origen.execute("DELETE FROM temp.lugares")
    for fuente, ciudad in origen.execute("SELECT DISTINCT fuente,ciudad FROM actividad WHERE ciudad<>''"):
        estado = estados[fuente]
        if not estado:
            continue  # no inventar una entidad
        m = catalogo.resolver_lugar(ciudad, estado)
        if m["resuelto"]:
            origen.execute("INSERT INTO temp.lugares VALUES(?,?,?,?,?,?)", (
                fuente, ciudad, m["municipio_clave"], m["municipio"], m["estado"], totales[m["estado_clave"]]))


def publicar(origen, destino, v):
    # Una lectura coherente de SQLite y una transacción para todos los lectores JDBC.
    ultimo = v.xrevrange("eira:bitacora", count=1)
    origen.execute("BEGIN")
    try:
        origen.execute("DELETE FROM temp.atlas_revision")
        if ultimo:
            origen.execute("INSERT INTO temp.atlas_revision VALUES(?)", (ultimo[0][0],))
        geografia(origen, v)
        with destino:
            destino.execute("BEGIN IMMEDIATE")
            for esquema, vista, nombre in ([("main", n, n) for n in VISTAS] +
                                           [("atlas", k, v) for k, v in ATLAS.items()]):
                cur = origen.execute(f"SELECT * FROM temp.{vista}")
                columnas = ", ".join(d[0] for d in cur.description)
                tabla = "datos_" + nombre
                destino.execute(f"CREATE TABLE IF NOT EXISTS {esquema}.{tabla} ({columnas})")
                # Ampliar la foto de la fase 2 sin reemplazar el archivo abierto por Next/JDBC.
                existentes = {r[1] for r in destino.execute(f"PRAGMA {esquema}.table_info({tabla})")}
                nuevas = [d[0] for d in cur.description if d[0] not in existentes]
                if nuevas:
                    for columna in nuevas:
                        destino.execute(f"ALTER TABLE {esquema}.{tabla} ADD COLUMN {columna}")
                    destino.execute(f"DROP VIEW IF EXISTS {esquema}.{nombre}")
                destino.execute(f"CREATE VIEW IF NOT EXISTS {esquema}.{nombre} AS SELECT {columnas} FROM {tabla}")
                destino.execute(f"DELETE FROM {esquema}.{tabla}")
                signos = ",".join("?" for _ in cur.description)
                destino.executemany(f"INSERT INTO {esquema}.{tabla} ({columnas}) VALUES({signos})", cur)
    finally:
        origen.rollback()
    print("Metabase: impacto, únicas, cruce y donantes =", destino.execute("SELECT * FROM v_global").fetchone(), flush=True)


def presencia(destino, v):
    fuentes = {r[0] for r in destino.execute("SELECT DISTINCT fuente FROM v_calidad")}
    if fuentes != set(v.zrange("eira:fuentes", 0, -1)):
        return  # el commit local puede preceder al MULTI del worker; llega otro evento al terminar
    mapas = {"global": Counter()}
    for programa, clave, n in destino.execute("SELECT iniciativa_id, municipio_clave, registros FROM v_presencia_municipios"):
        mapas.setdefault(programa, Counter())[clave] += n
        mapas["global"][clave] += n
    anteriores = list(v.scan_iter("eira:presencia:*"))
    with v.pipeline(transaction=True) as pipe:
        if anteriores:
            pipe.unlink(*anteriores)
        for alcance, cuentas in mapas.items():
            if cuentas:
                pipe.hset(f"eira:presencia:{alcance}", mapping=dict(cuentas))
        pipe.execute()


BORRAR_TERMINADO = """
local estado = server.call('HGET', KEYS[1], 'estado')
if estado == 'listo' or estado == 'duplicado' or estado == 'error' then
  return server.call('UNLINK', KEYS[2])
end
return 0
"""


def limpiar(v, trabajo):
    v.eval(BORRAR_TERMINADO, 2, f"eira:trabajo:{trabajo}", f"eira:archivo:{trabajo}")


def proyectar_eventos(origen, destino, v):
    # Pub/Sub no es durable y comparte canales entre bases. Las fichas y los bytes
    # siempre se comprueban en la base configurada. Reconciliar también al reconectar.
    with v.pubsub() as canal:
        canal.subscribe("eira:eventos")
        siguiente = 0
        while True:
            msg = canal.get_message(timeout=1)
            cambios = False
            for _ in range(128):
                if not msg:
                    break
                if msg["type"] == "subscribe":
                    siguiente = 0
                elif msg["type"] == "message":
                    try:
                        evento = json.loads(msg["data"])
                    except (ValueError, TypeError):
                        evento = {}
                    if isinstance(evento, dict) and evento.get("tipo") in ("trabajo", "fuente", "persona"):
                        trabajo = evento.get("id")
                        if evento["tipo"] == "trabajo" and isinstance(trabajo, str):
                            limpiar(v, trabajo)
                        cambios = True
                if _ < 127:
                    msg = canal.get_message(timeout=0)
            if time.monotonic() >= siguiente:
                for k in v.scan_iter("eira:archivo:*"):
                    limpiar(v, k.removeprefix("eira:archivo:"))
                siguiente = time.monotonic() + 60
                cambios = True
            if cambios:
                publicar(origen, destino, v)
                presencia(destino, v)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seguir", action="store_true", help="actualizar después de cada cambio de SQLite")
    parser.add_argument("--eventos", action="store_true", help="proyectar mapas, vistas y limpiar cargas terminadas")
    args = parser.parse_args()
    os.umask(0o077)
    estado = Path(os.environ["EIRA_ESTADO_DIR"]).resolve()
    ruta = estado / "metabase-selma.sqlite"
    origen = sqlite3.connect((estado / "eira.sqlite").as_uri() + "?mode=ro", uri=True)
    preparar(origen)
    destino = sqlite3.connect(ruta)
    destino.execute("ATTACH DATABASE ? AS atlas", (str(estado / "atlas-selma.sqlite"),))
    for esquema in ("main", "atlas"):
        marca = destino.execute(f"PRAGMA {esquema}.application_id").fetchone()[0]
        if marca != MARCA:
            if marca or destino.execute(f"SELECT count(*) FROM {esquema}.sqlite_master").fetchone()[0]:
                raise SystemExit("El destino no pertenece al adaptador")
            destino.execute(f"PRAGMA {esquema}.application_id={MARCA}")
        destino.execute(f"PRAGMA {esquema}.journal_mode=WAL")
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], password=os.getenv("VALKEY_PASSWORD") or None,
                               decode_responses=True, socket_timeout=5)
    version = None
    if args.eventos:
        return proyectar_eventos(origen, destino, v)
    while True:
        actual = origen.execute("PRAGMA data_version").fetchone()[0]
        if actual != version:
            publicar(origen, destino, v)
            version = actual
        if not args.seguir:
            break
        time.sleep(1)


if __name__ == "__main__":
    main()
