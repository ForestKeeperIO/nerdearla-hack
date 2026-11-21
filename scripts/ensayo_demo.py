#!/usr/bin/env python3
"""Guarda y restaura el estado del demo (Valkey + SQLite) para poder ensayar.

    uv run python scripts/ensayo_demo.py guardar   --dir <carpeta>
    uv run python scripts/ensayo_demo.py restaurar --dir <carpeta>

Usa VALKEY_URL (con numero de base) e IMPACTO_DB, igual que el motor. Detén el
motor antes y arráncalo después (el script no toca servicios). `restaurar`
borra SOLO las claves `eira:*` de esa base de Valkey y las repone; la base
SQLite se repone en su mismo archivo, para que Metabase no pierda la conexión.
"""
import argparse
import os
import pickle
import sqlite3
from pathlib import Path

import valkey


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("accion", choices=["guardar", "restaurar"])
    ap.add_argument("--dir", required=True)
    a = ap.parse_args()
    d = Path(a.dir)
    d.mkdir(parents=True, exist_ok=True)
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"],
                               password=os.environ.get("VALKEY_PASSWORD"))
    db = os.environ["IMPACTO_DB"]
    if a.accion == "guardar":
        claves = {k: (v.dump(k), v.pttl(k)) for k in v.scan_iter("eira:*", count=1000)}
        (d / "valkey.pickle").write_bytes(pickle.dumps(claves))
        copia = d / "impacto.sqlite"
        copia.unlink(missing_ok=True)
        with sqlite3.connect(db) as o:
            o.execute("VACUUM INTO ?", (str(copia),))
        print(f"guardado: {len(claves)} claves y {copia}")
        return
    claves = pickle.loads((d / "valkey.pickle").read_bytes())
    for k in list(v.scan_iter("eira:*", count=1000)):
        v.delete(k)
    for k, (dump, ttl) in claves.items():
        if dump is not None:
            v.restore(k, max(ttl, 0), dump, replace=True)
    o = sqlite3.connect(d / "impacto.sqlite")
    n = sqlite3.connect(db)
    o.backup(n)  # escribe dentro del mismo archivo
    n.close()
    o.close()
    v.publish("eira:eventos", '{"tipo": "fuente", "id": "ensayo"}')
    print(f"restaurado: {len(claves)} claves y {db}")


if __name__ == "__main__":
    main()
