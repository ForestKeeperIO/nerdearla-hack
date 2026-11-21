#!/usr/bin/env python3
"""Simula al frontend: sube los archivos de demostración y muestra qué contestó el procesamiento.

Requiere el worker corriendo (python -m procesador.worker) y Valkey en VALKEY_URL.
    python subir_demo.py                 # sube toda la secuencia de demostración
    python subir_demo.py archivo.xlsx "Tamizaje Rosa" atencion   # sube uno
"""
import json
import os
import sys
import time
import uuid
from pathlib import Path

import valkey

CARPETA = Path(__file__).resolve().parent / "datos_demo" / "archivos"
SECUENCIA = [
    ("tamizaje-rosa.xlsx", "Tamizaje Rosa", "atencion"),
    ("tamizaje-rosa-copia.xlsx", "Tamizaje Rosa", "atencion"),         # mismos bytes
    ("tamizaje-rosa-reguardado.xlsx", "Tamizaje Rosa", "atencion"),    # mismo contenido
    ("tamizaje-rosa-otro-orden.xlsx", "Tamizaje Rosa", "atencion"),    # columnas en otro orden
    ("tamizaje-rosa.csv", "Tamizaje Rosa", "atencion"),                # exportado a CSV
    ("tamizaje-rosa-v2.xlsx", "Tamizaje Rosa", "atencion"),            # versión nueva
    ("nutricion.xlsx", "Tamizaje Rosa", "atencion"),                   # traslape parcial
    ("melenas-en-movimiento.xlsx", "Melenas en Movimiento", "donacion"),
]


def subir(v, ruta: Path, programa: str, unidad: str) -> dict:
    t = "demo-" + uuid.uuid4().hex[:6]
    v.set(f"eira:archivo:{t}", ruta.read_bytes(), ex=3600)
    campos = {"nombre": ruta.name, "programa": programa, "unidad": unidad,
              "fecha_corte": "2026-09-30", "por": "demo"}
    v.hset(f"eira:trabajo:{t}", mapping={"estado": "pendiente", **campos})
    v.xadd("eira:trabajos", {"id": t, **campos})
    for _ in range(120):
        e = v.hget(f"eira:trabajo:{t}", "estado")
        if e not in (b"pendiente", b"procesando"):
            break
        time.sleep(0.25)
    return {k.decode(): x.decode() for k, x in v.hgetall(f"eira:trabajo:{t}").items()}


def main():
    v = valkey.Valkey.from_url(os.environ.get("VALKEY_URL", "redis://127.0.0.1:6379"),
                               password=os.environ.get("VALKEY_PASSWORD") or None)
    lista = [(CARPETA / sys.argv[1], sys.argv[2], sys.argv[3])] if len(sys.argv) == 4 else \
            [(CARPETA / n, p, u) for n, p, u in SECUENCIA]
    for ruta, prog, uni in lista:
        r = subir(v, ruta, prog, uni)
        print(f"\n{ruta.name}  →  {r.get('estado')} ({r.get('nivel_duplicado', '-')})\n   {r.get('mensaje', '')}")
    print("\n=== Métricas por informe ===")
    for alcance in ("tamizaje-rosa", "melenas-en-movimiento", "global"):
        m = {k.decode(): x.decode() for k, x in v.hgetall(f"eira:met:{alcance}").items()}
        if m:
            print(f"\n[{alcance}]", {k: m[k] for k in ("personas", "donantes", "personas_en_mas_de_un_programa",
                                                     "edad_promedio", "edad_n", "municipios", "unidades") if k in m})
    pares = v.hlen("eira:pares")
    print(f"\nPares de personas esperando decisión: {pares}")


if __name__ == "__main__":
    main()
