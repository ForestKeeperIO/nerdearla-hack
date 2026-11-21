#!/usr/bin/env python3
"""Provisiona Metabase por su API: cuenta de administración, conexión al
SQLite de reporte, preguntas (SQL nativas solo sobre vistas v_*) y los
tableros "Impacto" y "Calidad" con enlace público.

Uso:
    uv run --with requests metabase/provisionar.py [--entorno blanco|real] [--db RUTA]

Variables:
    METABASE_URL          URL interna de Metabase (defecto http://127.0.0.1:3200)
    METABASE_URL_PUBLICA  URL con la que se arman los enlaces públicos
                          (p. ej. la del túnel). Defecto: METABASE_URL.
    IMPACTO_DB            Ruta del SQLite a conectar (defecto data/impacto.sqlite)
    MB_ADMIN_EMAIL        Correo de la cuenta de administración
    MB_ADMIN_PASSWORD     Contraseña de la cuenta de administración

Si no hay credenciales en el entorno, se generan y se guardan en
.metabase/credenciales.json (ignorado por git). El script es idempotente:
reutiliza la base, las preguntas y los tableros que ya existan con el
mismo nombre, y los enlaces públicos ya creados.

Fuentes de la API verificadas contra el código de Metabase v0.65.6:
    src/metabase/setup_rest/api.clj        POST /api/setup {token,user,prefs}
    src/metabase/session/api.clj           POST /api/session {username,password}
    src/metabase/warehouses_rest/api.clj   POST /api/database {name,engine,details}
    src/metabase/driver/sqlite.clj         engine "sqlite", details {"db": ruta}
    src/metabase/queries_rest/api/card.clj POST /api/card {name,dataset_query,display,...}
    src/metabase/dashboards_rest/api.clj   POST /api/dashboard, PUT /api/dashboard/:id
                                           POST /api/dashboard/:id/public_link
    src/metabase/settings_rest/api.clj     PUT /api/setting/:key {value}
    src/metabase/public_sharing/settings.clj  ajuste "enable-public-sharing"
"""
import argparse
import json
import os
import re
import secrets
import sqlite3
import string
import sys
import time
import uuid
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DIR_METABASE = RAIZ / ".metabase"
CREDENCIALES = DIR_METABASE / "credenciales.json"
ENLACES = Path(__file__).resolve().parent / "enlaces.json"
TABLEROS = Path(__file__).resolve().parent / "tableros.json"

CATALOGO = RAIZ / "catalogos" / "iniciativas.json"
URL_PUBLICA = DIR_METABASE / "url-publica"

BASE = os.environ.get("METABASE_URL", "http://127.0.0.1:3200").rstrip("/")


def url_publica() -> str:
    """La del entorno; si no, la última guardada en .metabase/url-publica
    (así reprovisionar sin la variable no devuelve los enlaces a 127.0.0.1)."""
    url = os.environ.get("METABASE_URL_PUBLICA", "").strip()
    if url:
        DIR_METABASE.mkdir(exist_ok=True)
        URL_PUBLICA.write_text(url.rstrip("/") + "\n")
    elif URL_PUBLICA.exists():
        url = URL_PUBLICA.read_text().strip()
    return (url or BASE).rstrip("/")


PUBLICA = url_publica()


def sql_texto(valor: str) -> str:
    return "'" + valor.replace("'", "''") + "'"


MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def valores(ruta_db: str, columna: str, publicas: str) -> list:
    """Valores distintos de una columna para la lista de un filtro: periodo y
    servicio salen de v_conteos; municipio, de v_presencia_municipios (nombre
    oficial, no la ciudad tal como venía escrita en el archivo)."""
    assert columna in ("periodo", "servicio", "municipio"), columna
    vista = "v_presencia_municipios" if columna == "municipio" else "v_conteos"
    con = sqlite3.connect(f"file:{ruta_db}?mode=ro", uri=True)
    try:
        vals = [r[0] for r in con.execute(
            f"SELECT DISTINCT {columna} FROM {vista} WHERE {columna} <> ''"
            f" AND iniciativa_id NOT IN ({publicas}) ORDER BY 1")]
    finally:
        con.close()
    if columna == "periodo":  # «2026-02» se muestra como «feb 2026»
        return [[v, f"{MESES[int(v[5:7]) - 1]} {v[:4]}"] for v in vals]
    return vals


def expandir(obj, catalogo: dict, ruta_db: str):
    """Sustituye los marcadores de tableros.json con el catálogo de iniciativas."""
    inis = catalogo["iniciativas"]
    publicas = ", ".join(sql_texto(i["id"]) for i in inis
                         if i.get("clase") == "fuente_publica") or "''"
    if isinstance(obj, dict):
        return {k: expandir(v, catalogo, ruta_db) for k, v in obj.items()}
    if isinstance(obj, list):
        return [expandir(v, catalogo, ruta_db) for v in obj]
    if obj == "@PROGRAMAS_DEL_DEMO@":
        return [[i["id"], i["nombre"]] for i in inis if i.get("en_demo")]
    if isinstance(obj, str) and (m := re.fullmatch(r"@VALORES\((\w+)\)@", obj)):
        return valores(ruta_db, m.group(1), publicas)
    if isinstance(obj, str):
        def caso(m):
            col = m.group(1)
            ramas = " ".join(f"WHEN {sql_texto(i['id'])} THEN {sql_texto(i['nombre'])}"
                             for i in inis)
            return f"CASE {col} {ramas} ELSE {col} END"
        obj = re.sub(r"@PROGRAMA\((\w+)\)@", caso, obj)
        return obj.replace("@PUBLICAS@", publicas)
    return obj


def nueva_contrasena(n: int = 24) -> str:
    alfabeto = string.ascii_letters + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(n))


def cargar_credenciales() -> dict:
    if CREDENCIALES.exists():
        return json.loads(CREDENCIALES.read_text())
    return {
        "email": os.environ.get("MB_ADMIN_EMAIL", f"admin-{secrets.token_hex(3)}@eira.local"),
        "password": os.environ.get("MB_ADMIN_PASSWORD", nueva_contrasena()),
    }


def guardar_credenciales(creds: dict) -> None:
    DIR_METABASE.mkdir(exist_ok=True)
    CREDENCIALES.write_text(json.dumps(creds, indent=2, ensure_ascii=False) + "\n")
    CREDENCIALES.chmod(0o600)


class Metabase:
    def __init__(self, base: str):
        self.base = base
        self.s = requests.Session()

    def api(self, metodo: str, ruta: str, **kw):
        r = self.s.request(metodo, f"{self.base}/api{ruta}", timeout=60, **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"{metodo} {ruta} -> {r.status_code}: {r.text[:500]}")
        if r.status_code == 204 or not r.text:
            return {}
        return r.json()

    def esperar(self, segundos: int = 360) -> None:
        limite = time.time() + segundos
        while time.time() < limite:
            try:
                if self.s.get(f"{self.base}/api/health", timeout=5).ok:
                    return
            except requests.RequestException:
                pass
            time.sleep(3)
        raise SystemExit(f"Metabase no respondió en {self.base}")

    def entrar(self, creds: dict) -> None:
        """Crea la cuenta de administración si falta e inicia sesión."""
        props = self.api("GET", "/session/properties")
        token = props.get("setup-token")
        if token:  # primer arranque: crear la cuenta
            self.api("POST", "/setup", json={
                "token": token,
                "user": {
                    "email": creds["email"],
                    "password": creds["password"],
                    "first_name": "EIRA",
                    "last_name": "Admin",
                },
                "prefs": {"site_name": "EIRA — Impacto", "site_locale": "es"},
            })
        sesion = self.api("POST", "/session", json={
            "username": creds["email"], "password": creds["password"],
        })
        self.s.headers["X-Metabase-Session"] = sesion["id"]


def etiquetas(sql: str) -> dict:
    """Una variable de texto opcional por cada {{nombre}} de la consulta."""
    return {
        n: {"id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"eira-metabase/{n}")),
            "name": n, "display-name": n.capitalize(), "type": "text",
            "required": False}
        for n in dict.fromkeys(re.findall(r"\{\{(\w+)\}\}", sql))
    }


COLECCIONES = {"real": "Impacto EIRA · Real", "blanco": "Impacto EIRA · En blanco"}


def asegurar_coleccion(mb: Metabase, nombre: str) -> int:
    for c in mb.api("GET", "/collection"):
        if c["name"] == nombre and not c.get("archived"):
            return c["id"]
    return mb.api("POST", "/collection", json={"name": nombre})["id"]


def migrar_sufijos(mb: Metabase, colecciones: dict) -> None:
    """Primera pasada creó títulos con sufijo de entorno («X [real]»,
    «X (blanco)»). Los renombra sin sufijo y los mueve a la colección de su
    entorno: el entorno se distingue por la colección, no en el título.
    Conserva ids y enlaces públicos."""
    for card in mb.api("GET", "/card", params={"f": "all"}):
        m = re.match(r"^(.*) \[(real|blanco)\]$", card["name"])
        if m:
            mb.api("PUT", f"/card/{card['id']}", json={
                "name": m.group(1), "collection_id": colecciones[m.group(2)],
            })
    for d in mb.api("GET", "/dashboard"):
        if d.get("archived"):
            continue
        if d["name"].endswith(" (blanco)"):
            mb.api("PUT", f"/dashboard/{d['id']}", json={
                "name": d["name"][: -len(" (blanco)")],
                "collection_id": colecciones["blanco"],
            })
        elif d.get("collection_id") is None and d["name"] in ("Impacto", "Calidad"):
            mb.api("PUT", f"/dashboard/{d['id']}",
                   json={"collection_id": colecciones["real"]})


def asegurar_base(mb: Metabase, nombre: str, ruta_db: str) -> int:
    """Devuelve el id de la conexión a SQLite llamada `nombre`; la crea si falta.
    La conexión «Impacto EIRA» de la primera pasada se renombra a
    «Impacto EIRA (real)» en lugar de duplicarla."""
    dbs = mb.api("GET", "/database")
    dbs = dbs.get("data", dbs) if isinstance(dbs, dict) else dbs
    if nombre == "Impacto EIRA (real)":
        for db in dbs:
            if db["name"] == "Impacto EIRA":
                mb.api("PUT", f"/database/{db['id']}", json={
                    "name": nombre, "engine": "sqlite",
                    "details": {"db": ruta_db}, "auto_run_queries": True,
                })
                return db["id"]
    for db in dbs:
        if db["name"] == nombre:
            detalles = db.get("details") or {}
            if detalles.get("db") != ruta_db:
                mb.api("PUT", f"/database/{db['id']}", json={
                    "name": nombre, "engine": "sqlite",
                    "details": {"db": ruta_db}, "auto_run_queries": True,
                })
            return db["id"]
    db = mb.api("POST", "/database", json={
        "name": nombre, "engine": "sqlite",
        "details": {"db": ruta_db},
        "is_full_sync": True, "auto_run_queries": True,
    })
    return db["id"]


def asegurar_pregunta(mb: Metabase, db_id: int, coleccion_id: int, p: dict) -> int:
    native = {"query": p["sql"]}
    if etiquetas(p["sql"]):
        native["template_tags"] = etiquetas(p["sql"])
    cuerpo = {
        "name": p["nombre"],
        "collection_id": coleccion_id,
        "type": "question",
        "display": p["display"],
        "dataset_query": {
            "type": "native",
            "database": db_id,
            "native": native,
        },
        "visualization_settings": p.get("visualization_settings", {}),
    }
    for card in mb.api("GET", "/card", params={"f": "all"}):
        if card["name"] == p["nombre"] and card.get("collection_id") == coleccion_id:
            mb.api("PUT", f"/card/{card['id']}", json=cuerpo)
            return card["id"]
    return mb.api("POST", "/card", json=cuerpo)["id"]


def archivar_huerfanas(mb: Metabase, coleccion_id: int, vigentes: set[int]) -> int:
    """Archiva las preguntas de la colección que ya no están en tableros.json
    (renombradas o retiradas), para que no queden versiones viejas a la vista."""
    n = 0
    for card in mb.api("GET", "/card", params={"f": "all"}):
        if (card.get("collection_id") == coleccion_id and not card.get("archived")
                and card["id"] not in vigentes):
            mb.api("PUT", f"/card/{card['id']}", json={"archived": True})
            n += 1
    return n


def tarjeta_de_texto(t: dict) -> dict:
    return {
        "virtual_card": {"name": None, "display": t.get("display", "text"),
                         "visualization_settings": {}, "dataset_query": {},
                         "archived": False},
        "text": t["texto"],
    }


def asegurar_tablero(mb: Metabase, nombre: str, coleccion_id: int,
                     tarjetas: list[dict], parametros: list[dict] | None,
                     descripcion: str | None = None) -> int:
    """Crea el tablero si falta y deja su disposición como en tableros.json."""
    tablero_id = None
    for d in mb.api("GET", "/dashboard"):
        if (d["name"] == nombre and not d.get("archived")
                and d.get("collection_id") == coleccion_id):
            tablero_id = d["id"]
            break
    if tablero_id is None:
        cuerpo = {"name": nombre, "collection_id": coleccion_id}
        if parametros:
            cuerpo["parameters"] = parametros
        tablero_id = mb.api("POST", "/dashboard", json=cuerpo)["id"]
    slugs = [x["slug"] for x in parametros or []]
    dashcards = [
        {
            "id": -(i + 1),  # id negativo temporal: la API lo crea como tarjeta nueva
            "card_id": t["card_id"],
            "visualization_settings": tarjeta_de_texto(t) if t.get("texto") else {},
            "row": t["row"], "col": t["col"],
            "size_x": t["size_x"], "size_y": t["size_y"],
            "parameter_mappings": [
                {"parameter_id": slug, "card_id": t["card_id"],
                 "target": ["variable", ["template-tag", slug]]}
                for slug in slugs if slug in t.get("variables", ())
            ],
            "series": [],
        }
        for i, t in enumerate(tarjetas)
    ]
    # Ancho completo: sin el tope de 1048 px del modo «fijo».
    cuerpo = {"dashcards": dashcards, "width": "full", "description": descripcion}
    if parametros:
        cuerpo["parameters"] = parametros
    mb.api("PUT", f"/dashboard/{tablero_id}", json=cuerpo)
    return tablero_id


def enlace_publico(mb: Metabase, tablero_id: int) -> str:
    uuid = mb.api("POST", f"/dashboard/{tablero_id}/public_link")["uuid"]
    return f"{PUBLICA}/public/dashboard/{uuid}"


def quitar_enlace_publico(mb: Metabase, tablero_id: int) -> None:
    if mb.api("GET", f"/dashboard/{tablero_id}").get("public_uuid"):
        mb.api("DELETE", f"/dashboard/{tablero_id}/public_link")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--entorno", default="real", choices=["blanco", "real"],
                    help="cada entorno tiene su propia conexión y sus tableros")
    ap.add_argument("--db", default=os.environ.get("IMPACTO_DB", str(RAIZ / "data" / "impacto.sqlite")))
    ap.add_argument("--principal", choices=["blanco", "real"], default=None,
                    help="entorno cuyas direcciones van en las claves de primer nivel de"
                         " enlaces.json (las que incrusta el frontend); se recuerda")
    args = ap.parse_args()

    ruta_db = str(Path(args.db).resolve())
    if not Path(ruta_db).exists():
        raise SystemExit(f"No existe la base: {ruta_db} (créala con metabase/construir_demo.py)")

    mb = Metabase(BASE)
    mb.esperar()
    creds = cargar_credenciales()
    mb.entrar(creds)
    guardar_credenciales(creds)

    mb.api("PUT", "/setting/site-url", json={"value": PUBLICA})
    mb.api("PUT", "/setting/enable-public-sharing", json={"value": True})

    colecciones = {e: asegurar_coleccion(mb, n) for e, n in COLECCIONES.items()}
    migrar_sufijos(mb, colecciones)
    coleccion_id = colecciones[args.entorno]

    db_id = asegurar_base(mb, f"Impacto EIRA ({args.entorno})", ruta_db)
    try:
        mb.api("POST", f"/database/{db_id}/sync_schema")
    except RuntimeError:
        pass  # no fatal: el primer sync ya corre con auto_run_queries

    spec = expandir(json.loads(TABLEROS.read_text()),
                    json.loads(CATALOGO.read_text()), ruta_db)
    enlaces = json.loads(ENLACES.read_text()) if ENLACES.exists() else {}
    enlaces.setdefault("entornos", {})
    # Un solo juego de enlaces públicos: el del entorno «principal» (el que lee
    # la base de la aplicación en línea). Los demás entornos quedan sin enlace
    # público para que nadie caiga en datos que no son los de la aplicación.
    principal = args.principal or enlaces.get("principal") or "real"
    es_principal = args.entorno == principal
    ent = enlaces["entornos"][args.entorno] = {}
    vigentes: set[int] = set()
    for t in spec["tableros"]:
        if args.entorno not in t.get("entornos", [args.entorno]):
            continue
        tarjetas = []
        for p in t["preguntas"]:
            pos = {k: p[k] for k in ("row", "col", "size_x", "size_y")}
            if p.get("texto"):
                tarjetas.append({"card_id": None, "texto": p["texto"],
                                 "display": p.get("display", "text"), **pos})
                continue
            card_id = asegurar_pregunta(mb, db_id, coleccion_id, p)
            vigentes.add(card_id)
            tarjetas.append({"card_id": card_id, **pos,
                             "variables": list(etiquetas(p["sql"]))})
        dash_id = asegurar_tablero(mb, t["nombre"], coleccion_id, tarjetas,
                                   t.get("parametros"), t.get("descripcion"))
        if not es_principal:
            quitar_enlace_publico(mb, dash_id)
            print(f"Tablero «{t['nombre']}» ({args.entorno}): sin enlace público (id {dash_id})")
            continue
        url = enlace_publico(mb, dash_id)
        clave = t.get("clave") or t["nombre"].lower()
        ent[clave] = url
        if t.get("parametros"):
            # Plantilla: sustituir {programa} por el id de la iniciativa
            # (p. ej. tamizaje-rosa, melenas-en-movimiento).
            ent[f"{clave}_por_programa"] = f"{url}?programa={{programa}}"
        print(f"Tablero «{t['nombre']}» ({args.entorno}): {url}")
    archivadas = archivar_huerfanas(mb, coleccion_id, vigentes)
    if archivadas:
        print(f"Preguntas viejas archivadas: {archivadas}")

    # Claves de primer nivel = las que incrusta el frontend: las del entorno
    # «principal» (el que lee la base de la aplicación en línea).
    enlaces["entornos"] = {e: v for e, v in enlaces["entornos"].items() if v}
    pre = enlaces["entornos"].get(principal) or {}
    enlaces = {"principal": principal, "entornos": enlaces["entornos"], **pre}
    ENLACES.write_text(json.dumps(enlaces, indent=2, ensure_ascii=False) + "\n")
    print(f"Enlaces escritos en {ENLACES}")


if __name__ == "__main__":
    main()
