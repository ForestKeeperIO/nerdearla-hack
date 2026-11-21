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
import secrets
import string
import sys
import time
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DIR_METABASE = RAIZ / ".metabase"
CREDENCIALES = DIR_METABASE / "credenciales.json"
ENLACES = Path(__file__).resolve().parent / "enlaces.json"
TABLEROS = Path(__file__).resolve().parent / "tableros.json"

BASE = os.environ.get("METABASE_URL", "http://127.0.0.1:3200").rstrip("/")
PUBLICA = os.environ.get("METABASE_URL_PUBLICA", BASE).rstrip("/")


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


def asegurar_base(mb: Metabase, nombre: str, ruta_db: str) -> int:
    """Devuelve el id de la conexión a SQLite llamada `nombre`; la crea si falta."""
    dbs = mb.api("GET", "/database")
    for db in dbs.get("data", dbs) if isinstance(dbs, dict) else dbs:
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


def asegurar_pregunta(mb: Metabase, db_id: int, coleccion_nombre: str, p: dict) -> int:
    nombre = f"{p['nombre']} [{coleccion_nombre}]"
    cuerpo = {
        "name": nombre,
        "type": "question",
        "display": p["display"],
        "dataset_query": {
            "type": "native",
            "database": db_id,
            "native": {"query": p["sql"]},
        },
        "visualization_settings": p.get("visualization_settings", {}),
    }
    for card in mb.api("GET", "/card", params={"f": "all"}):
        if card["name"] == nombre:
            mb.api("PUT", f"/card/{card['id']}", json=cuerpo)
            return card["id"]
    return mb.api("POST", "/card", json=cuerpo)["id"]


def asegurar_tablero(mb: Metabase, nombre: str, tarjetas: list[dict]) -> int:
    """Crea el tablero si falta y deja su disposición como en tableros.json."""
    tablero_id = None
    for d in mb.api("GET", "/dashboard"):
        if d["name"] == nombre and not d.get("archived"):
            tablero_id = d["id"]
            break
    if tablero_id is None:
        tablero_id = mb.api("POST", "/dashboard", json={"name": nombre})["id"]
    dashcards = [
        {
            "id": -(i + 1),  # id negativo temporal: la API lo crea como tarjeta nueva
            "card_id": t["card_id"],
            "row": t["row"], "col": t["col"],
            "size_x": t["size_x"], "size_y": t["size_y"],
            "parameter_mappings": [], "series": [],
        }
        for i, t in enumerate(tarjetas)
    ]
    mb.api("PUT", f"/dashboard/{tablero_id}", json={"dashcards": dashcards})
    return tablero_id


def enlace_publico(mb: Metabase, tablero_id: int) -> str:
    uuid = mb.api("POST", f"/dashboard/{tablero_id}/public_link")["uuid"]
    return f"{PUBLICA}/public/dashboard/{uuid}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--entorno", default="real", choices=["blanco", "real"],
                    help="cada entorno tiene su propia conexión y sus tableros")
    ap.add_argument("--db", default=os.environ.get("IMPACTO_DB", str(RAIZ / "data" / "impacto.sqlite")))
    args = ap.parse_args()

    ruta_db = str(Path(args.db).resolve())
    if not Path(ruta_db).exists():
        raise SystemExit(f"No existe la base: {ruta_db} (créala con metabase/datos_prueba.py)")

    mb = Metabase(BASE)
    mb.esperar()
    creds = cargar_credenciales()
    mb.entrar(creds)
    guardar_credenciales(creds)

    mb.api("PUT", "/setting/site-url", json={"value": PUBLICA})
    mb.api("PUT", "/setting/enable-public-sharing", json={"value": True})

    sufijo = "" if args.entorno == "real" else f" ({args.entorno})"
    db_id = asegurar_base(mb, f"Impacto EIRA{sufijo}", ruta_db)
    try:
        mb.api("POST", f"/database/{db_id}/sync_schema")
    except RuntimeError:
        pass  # no fatal: el primer sync ya corre con auto_run_queries

    spec = json.loads(TABLEROS.read_text())
    enlaces = json.loads(ENLACES.read_text()) if ENLACES.exists() else {}
    enlaces.setdefault("entornos", {})
    for t in spec["tableros"]:
        nombre = f"{t['nombre']}{sufijo}"
        tarjetas = []
        for p in t["preguntas"]:
            card_id = asegurar_pregunta(mb, db_id, args.entorno, p)
            tarjetas.append({"card_id": card_id, "row": p["row"], "col": p["col"],
                             "size_x": p["size_x"], "size_y": p["size_y"]})
        dash_id = asegurar_tablero(mb, nombre, tarjetas)
        url = enlace_publico(mb, dash_id)
        enlaces["entornos"].setdefault(args.entorno, {})[t["nombre"].lower()] = url
        print(f"Tablero «{nombre}»: {url}")

    # Claves de primer nivel para el frontend: el entorno real si existe.
    pre = enlaces["entornos"].get("real") or enlaces["entornos"].get(args.entorno) or {}
    enlaces.update(pre)
    ENLACES.write_text(json.dumps(enlaces, indent=2, ensure_ascii=False) + "\n")
    print(f"Enlaces escritos en {ENLACES}")


if __name__ == "__main__":
    main()
