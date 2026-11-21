#!/usr/bin/env python3
"""Construye el SQLite que leen los tableros pasando los reportes del demo por
el MOTOR REAL (py/motor/worker.py), no con filas insertadas a mano.

Uso:
    uv run python metabase/construir_demo.py            # data/impacto.sqlite
    uv run python metabase/construir_demo.py --vacia    # data/impacto-vacia.sqlite

Qué carga (en este orden):
    reportes/tamizaje-rosa.xlsx           tamizaje-rosa · atencion
    reportes/tamizaje-rosa_v2.xlsx        tamizaje-rosa · atencion (versión nueva)
    reportes/melenas-en-movimiento.xlsx   melenas-en-movimiento · según la fila
    reportes-reales/*.csv                 salud-publica-jalisco · registro_publico

El motor necesita Valkey: se usa una base propia y aislada (por defecto la 11
de 127.0.0.1:6379) y solo se borran en ella las claves eira:*; jamás FLUSHALL.
La clave HMAC se genera una vez en .metabase/clave-hmac (ignorado por git).

Variables: DEMO_MB_VALKEY_URL (defecto redis://127.0.0.1:6379/11).
Sale con código distinto de cero si algún archivo no termina en «listo».
"""
import argparse
import os
import secrets
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
_mod = sys.modules.get("py")
if _mod is not None and not hasattr(_mod, "__path__"):
    del sys.modules["py"]
sys.path.insert(0, str(RAIZ))

# archivo, programa, unidad, fecha de corte
TRABAJOS = [
    ("reportes/tamizaje-rosa.xlsx", "tamizaje-rosa", "atencion", "2026-09-30"),
    ("reportes/tamizaje-rosa_v2.xlsx", "tamizaje-rosa", "atencion", "2026-10-31"),
    ("reportes/melenas-en-movimiento.xlsx", "melenas-en-movimiento", "segun_fila", "2026-09-30"),
    ("reportes-reales/defunciones_mujeres_jalisco_c50_c53_2024.csv",
     "salud-publica-jalisco", "registro_publico", "2026-11-21"),
    ("reportes-reales/defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv",
     "salud-publica-jalisco", "registro_publico", "2026-11-21"),
    ("reportes-reales/egresos_hospitalarios_jalisco_c50_c53_2024.csv",
     "salud-publica-jalisco", "registro_publico", "2026-11-21"),
    ("reportes-reales/clues_unidades_salud_jalisco_2026.csv",
     "salud-publica-jalisco", "registro_publico", "2026-11-21"),
]


def clave_hmac() -> str:
    ruta = RAIZ / ".metabase" / "clave-hmac"
    if not ruta.exists():
        ruta.parent.mkdir(exist_ok=True)
        ruta.write_text(secrets.token_hex(32))
        ruta.chmod(0o600)
    return ruta.read_text().strip()


def limpiar(v) -> int:
    n, cur = 0, 0
    while True:
        cur, ks = v.scan(cur, match="eira:*", count=500)
        if ks:
            v.delete(*ks)
            n += len(ks)
        if cur == 0:
            return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vacia", action="store_true",
                    help="solo esquema y catálogos (entorno en blanco)")
    ap.add_argument("--db", default=None)
    args = ap.parse_args()
    destino = Path(args.db or RAIZ / "data" / (
        "impacto-vacia.sqlite" if args.vacia else "impacto.sqlite")).resolve()

    os.environ["VALKEY_URL"] = os.environ.get(
        "DEMO_MB_VALKEY_URL", "redis://127.0.0.1:6379/11")
    os.environ.setdefault("IMPACTO_HMAC_KEY", clave_hmac())

    from db.crear import crear
    from py.motor import worker

    # Se construye aparte y se sustituye al final: Metabase nunca ve la base a medias.
    tmp = destino.with_suffix(".construyendo")
    for f in (tmp, Path(str(tmp) + "-wal"), Path(str(tmp) + "-shm")):
        f.unlink(missing_ok=True)
    db = crear(str(tmp), con_denominadores=True)
    db.row_factory = None

    fallos = []
    if not args.vacia:
        v = worker.conectar()
        vb = worker.conectar(texto=False)
        print(f"eira:* borradas antes: {limpiar(v)}")
        worker.asegurar_grupos(v)
        for ruta, programa, unidad, corte in TRABAJOS:
            archivo = RAIZ / ruta
            tid = worker.encolar(v, archivo.read_bytes(), archivo.name, programa,
                                 unidad, corte, por="demo-metabase")
            for _ in range(20):
                worker.ciclo(v, db, bloque_ms=200, vb=vb)
                t = v.hgetall(f"eira:trabajo:{tid}")
                if t.get("estado") in ("listo", "duplicado", "error"):
                    break
            print(f"  {archivo.name}: {t.get('estado')} · nuevas {t.get('filas_nuevas', '?')}"
                  f" · omitidas {t.get('filas_omitidas', '?')}"
                  f" · {t.get('mensaje', '')}".rstrip(" ·"))
            if t.get("estado") != "listo":
                fallos.append(archivo.name)
        print(f"eira:* borradas después: {limpiar(v)}")

    db.commit()
    db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    db.close()
    for f in (Path(str(tmp) + "-wal"), Path(str(tmp) + "-shm")):
        f.unlink(missing_ok=True)
    os.replace(tmp, destino)
    print(f"Base escrita: {destino}")
    if fallos:
        print("NO terminaron en «listo»: " + ", ".join(fallos), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
