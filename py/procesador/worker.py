"""Trabajador: toma archivos de eira:trabajos y decisiones de eira:decisiones.

Uso (desde la carpeta py/):  python -m procesador.worker
Variables: VALKEY_URL, VALKEY_PASSWORD, EIRA_HMAC_KEY (opcional), EIRA_ESTADO_DIR (opcional).
"""
from __future__ import annotations

import logging
import os
import sys
import time

import valkey

from .estado import abrir, llave_hmac
from .trabajos import Procesador, _campos, log

GRUPO = "procesadores"
FLUJOS = ("eira:trabajos", "eira:decisiones")


def conectar():
    return valkey.Valkey.from_url(os.environ.get("VALKEY_URL", "redis://127.0.0.1:6379"),
                                  password=os.environ.get("VALKEY_PASSWORD") or None, decode_responses=False,
                                  socket_timeout=30, socket_connect_timeout=5, retry_on_timeout=True,
                                  health_check_interval=30)


def preparar_grupos(v):
    for f in FLUJOS:
        try:
            v.xgroup_create(f, GRUPO, id="0", mkstream=True)
        except valkey.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise


def atender(p: Procesador, flujo: str, msg_id, campos) -> None:
    datos = _campos(campos)
    if flujo == "eira:trabajos":
        p.procesar_trabajo(datos)
    else:
        p.aplicar_decision(datos)
    p.v.xack(flujo, GRUPO, msg_id)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    v = conectar()
    v.ping()
    preparar_grupos(v)
    p = Procesador(v, abrir(), llave_hmac())
    if v.exists("eira:fuentes") and not p.con.execute("SELECT 1 FROM fuentes LIMIT 1").fetchone():
        log.warning("Valkey ya tiene fuentes que este procesamiento no escribió (¿la semilla?). "
                    "Al procesar el primer archivo se reemplazarán personas, conteos y fuentes. "
                    "Usa `npm run limpiar` si no quieres mezclar.")
    consumidor = os.environ.get("EIRA_CONSUMIDOR", "py-1")
    log.info("Esperando trabajos como '%s' en el grupo '%s'…", consumidor, GRUPO)
    # Primero lo pendiente de una ejecución anterior (entregado pero sin XACK), luego lo nuevo.
    for inicio in ("0", ">"):
        while True:
            try:
                lote = v.xreadgroup(GRUPO, consumidor, {f: inicio for f in FLUJOS}, count=10,
                                    block=None if inicio == "0" else 5000)
            except (valkey.TimeoutError, valkey.ConnectionError) as e:
                log.warning("Valkey no respondió (%s); reintentando.", e)
                time.sleep(1)
                continue
            vacio = True
            for flujo, mensajes in lote or []:
                for msg_id, campos in mensajes:
                    vacio = False
                    atender(p, flujo.decode() if isinstance(flujo, bytes) else flujo, msg_id, campos)
            if inicio == "0" and vacio:
                break
            if inicio == ">" and vacio:
                continue


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
