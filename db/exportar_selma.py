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


def preparar(origen):
    origen.execute("CREATE TEMP TABLE tipos(programa, tipo, impactada, objetos, PRIMARY KEY(programa,tipo))")
    origen.execute("CREATE TEMP TABLE lugares(fuente, ciudad, clave, municipio, estado, "
                   "municipios_del_estado, PRIMARY KEY(fuente,ciudad))")
    ruta = os.getenv("EIRA_CATALOGO") or Path(os.environ["SELMA_PY"]).parent / "catalogos/iniciativas.json"
    cat = json.loads(Path(ruta).read_text())
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
    origen.execute("BEGIN")
    try:
        geografia(origen, v)
        with destino:
            destino.execute("BEGIN IMMEDIATE")
            for nombre in VISTAS:
                cur = origen.execute(f"SELECT * FROM temp.{nombre}")
                columnas = ", ".join(d[0] for d in cur.description)
                tabla = "datos_" + nombre
                destino.execute(f"CREATE TABLE IF NOT EXISTS {tabla} ({columnas})")
                destino.execute(f"CREATE VIEW IF NOT EXISTS {nombre} AS SELECT {columnas} FROM {tabla}")
                destino.execute(f"DELETE FROM {tabla}")
                signos = ",".join("?" for _ in cur.description)
                destino.executemany(f"INSERT INTO {tabla} ({columnas}) VALUES({signos})", cur)
    finally:
        origen.rollback()
    print("Metabase: impacto, únicas, cruce y donantes =", destino.execute("SELECT * FROM v_global").fetchone(), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seguir", action="store_true", help="actualizar después de cada cambio de SQLite")
    args = parser.parse_args()
    os.umask(0o077)
    estado = Path(os.environ["EIRA_ESTADO_DIR"]).resolve()
    ruta = estado / "metabase-selma.sqlite"
    origen = sqlite3.connect((estado / "eira.sqlite").as_uri() + "?mode=ro", uri=True)
    preparar(origen)
    destino = sqlite3.connect(ruta)
    marca = destino.execute("PRAGMA application_id").fetchone()[0]
    if marca != MARCA:
        if marca or destino.execute("SELECT count(*) FROM sqlite_master").fetchone()[0]:
            raise SystemExit("El destino no pertenece al adaptador")
        destino.execute(f"PRAGMA application_id={MARCA}")
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], password=os.getenv("VALKEY_PASSWORD") or None,
                               decode_responses=True, socket_timeout=5)
    version = None
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
