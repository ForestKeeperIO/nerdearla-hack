"""Ver o cambiar solo la ruta de la conexión existente; conserva tarjetas y enlaces."""
import argparse
import json
import os
import sqlite3
from pathlib import Path
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--desde", help="ruta actual esperada (comprobada antes del PUT)")
    parser.add_argument("--hasta", type=Path, help="SQLite existente con las vistas de EIRA")
    args = parser.parse_args()
    if bool(args.desde) != bool(args.hasta):
        parser.error("Para cambiar la conexión se necesitan --desde y --hasta")
    base = os.environ["METABASE_URL"].rstrip("/") + "/api"
    headers = {"Content-Type": "application/json"}

    def api(ruta, metodo="GET", cuerpo=None):
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
        with urlopen(Request(base + ruta, datos, headers, method=metodo), timeout=30) as r:
            return json.load(r)

    headers["X-Metabase-Session"] = os.getenv("MB_SESSION") or api("/session", "POST", {
        "username": os.environ["MB_ADMIN_EMAIL"], "password": os.environ["MB_ADMIN_PASSWORD"]})["id"]
    db, = (d for d in api("/database")["data"]
           if d["name"] == "Impacto EIRA (blanco)" and d["engine"] == "sqlite")
    ruta = "/database/" + str(db["id"])
    detalles = api(ruta)["details"]
    if not args.hasta:
        print(detalles["db"])
        return
    if detalles["db"] != args.desde:
        raise SystemExit("Cambió el origen esperado: no se modificó Metabase")
    hasta = args.hasta.resolve(strict=True)
    with sqlite3.connect(hasta.as_uri() + "?mode=ro", uri=True) as con:
        con.execute("SELECT total_personas_impactadas FROM v_global").fetchone()
    api(ruta, "PUT", {"name": db["name"], "engine": db["engine"], "details": {**detalles, "db": str(hasta)}})
    if api(ruta)["details"]["db"] != str(hasta):
        raise SystemExit("Metabase no confirmó la ruta nueva")
    print(hasta)


if __name__ == "__main__":
    main()
