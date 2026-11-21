#!/usr/bin/env python3
"""Encola un archivo en Valkey igual que lo hace el frontend, para probar el
motor sin interfaz.

Uso:
    uv run python scripts/procesar_local.py reportes/tamizaje-rosa.xlsx \
        --programa tamizaje-rosa --unidad atencion --fecha-corte 2026-09-30
    uv run python scripts/procesar_local.py reportes/melenas-en-movimiento.xlsx \
        --programa melenas-en-movimiento --unidad segun_fila --fecha-corte 2026-09-30

`--programa` es el id de la iniciativa del catalogo (catalogos/iniciativas.json).
`--unidad` es un tipo de registro del catalogo, o `segun_fila`/vacio cuando el
tipo se decide por fila con la columna Tipo del archivo.

Variables de entorno: VALKEY_URL (con numero de base), VALKEY_PASSWORD.
Con --espera N (por defecto 30 s) espera el estado final e imprime el hash
eira:trabajo:<id> completo.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from py.motor import worker  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description="Encola un reporte en eira:trabajos")
    ap.add_argument("archivo")
    ap.add_argument("--programa", required=True)
    ap.add_argument("--unidad", default="",
                    help="tipo de registro; vacio o 'segun_fila' si lo decide la columna Tipo")
    ap.add_argument("--fecha-corte", required=True)
    ap.add_argument("--estado-clave", default="14",
                    help="clave INEGI de la entidad de las ciudades (14 = Jalisco)")
    ap.add_argument("--por", default="local")
    ap.add_argument("--espera", type=int, default=30,
                    help="segundos a esperar el resultado (0 = solo encolar)")
    args = ap.parse_args()

    ruta = Path(args.archivo)
    v = worker.conectar()
    worker.asegurar_grupos(v)
    tid = worker.encolar(v, ruta.read_bytes(), ruta.name, args.programa,
                         args.unidad, args.fecha_corte, args.por,
                         estado_clave=args.estado_clave)
    print(f"trabajo {tid} encolado: {ruta.name} → {args.programa} / {args.unidad}")

    if args.espera:
        limite = time.time() + args.espera
        while time.time() < limite:
            t = v.hgetall(f"eira:trabajo:{tid}")
            if t.get("estado") in ("listo", "duplicado", "error"):
                print(json.dumps(t, ensure_ascii=False, indent=2))
                return
            time.sleep(0.5)
        print(f"sigue en proceso tras {args.espera} s", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
