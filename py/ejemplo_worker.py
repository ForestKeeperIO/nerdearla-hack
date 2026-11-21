#!/usr/bin/env python3
"""Ejemplo mínimo del contrato: un trabajador de procesamiento en Python.

Toma trabajos del stream eira:trabajos (grupo "procesadores"), los marca
procesando y luego listo, publica en eira:eventos y hace XACK.

Uso:
    pip install valkey
    VALKEY_URL=redis://127.0.0.1:6391 python3 ejemplo_worker.py
"""
import json
import os
import time

import valkey  # pip install valkey

v = valkey.Valkey.from_url(
    os.environ.get("VALKEY_URL", "redis://127.0.0.1:6379"),
    password=os.environ.get("VALKEY_PASSWORD"),
    decode_responses=False,
)

try:
    v.xgroup_create("eira:trabajos", "procesadores", id="0", mkstream=True)
except valkey.ResponseError:
    pass  # el grupo ya existe

while True:
    lote = v.xreadgroup("procesadores", "py-1", {"eira:trabajos": ">"}, count=1, block=5000)
    for _, mensajes in lote or []:
        for msg_id, campos in mensajes:
            t = campos[b"id"].decode()
            contenido = v.get(f"eira:archivo:{t}")  # bytes del Excel
            v.hset(f"eira:trabajo:{t}", mapping={"estado": "procesando"})
            # … leer, deduplicar, unificar, y escribir eira:fuente:*,
            #   eira:per:*, eira:cnt:* …
            v.hset(
                f"eira:trabajo:{t}",
                mapping={
                    "estado": "listo",
                    "mensaje": "Se agregaron 120 filas.",
                    "terminado_en": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
            )
            v.publish("eira:eventos", json.dumps({"tipo": "trabajo", "id": t}))
            v.xack("eira:trabajos", "procesadores", msg_id)
