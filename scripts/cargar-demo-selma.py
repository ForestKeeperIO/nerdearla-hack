"""Sube el manifiesto ficticio por la API y espera el estado final de cada carga."""
import argparse
import json
import os
import subprocess
import time
from pathlib import Path

import valkey


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probar-duplicado", action="store_true")
    args = parser.parse_args()
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], decode_responses=True,
                               password=os.getenv("VALKEY_PASSWORD") or None, socket_timeout=5)
    archivos = Path(os.environ["SELMA_PY"]) / "datos_demo" / "archivos"
    manifiesto = ["tamizaje-rosa.xlsx", "tamizaje-rosa-v2.xlsx", "nutricion.xlsx", "melenas-en-movimiento.xlsx"]
    if args.probar_duplicado:
        manifiesto.insert(1, "tamizaje-rosa-copia.xlsx")
    for nombre in manifiesto:
        melenas = nombre.startswith("melenas-")
        respuesta = subprocess.check_output([
            "curl", "-fsS", "--max-time", "30", os.environ["APP_URL"].rstrip("/") + "/api/subir",
            "-F", f"archivo=@{archivos / nombre}", "-F", "fecha_corte=2026-11-21",
            "-F", "estado_clave=14", "-F", "por=Demo EIRA",
            "-F", "programa=" + ("melenas-en-movimiento" if melenas else "tamizaje-rosa"),
            "-F", "unidad=" + ("donacion" if melenas else "atencion")])
        trabajo = json.loads(respuesta)["id"]
        for _ in range(300):
            estado, nivel, nuevas = v.hmget("eira:trabajo:" + trabajo, "estado", "nivel_duplicado", "filas_nuevas")
            if estado in ("listo", "duplicado", "error"):
                break
            time.sleep(0.1)
        print(nombre, trabajo, estado, nivel, nuevas, flush=True)
        if estado not in ("listo", "duplicado"):
            raise SystemExit("Carga incompleta: revisar el trabajo antes de continuar")


if __name__ == "__main__":
    main()
