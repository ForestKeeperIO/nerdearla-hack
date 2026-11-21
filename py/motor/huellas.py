"""Huellas para omitir duplicados (capa 1 y 2 del plan).

- huella_bytes: sha256 de los bytes del archivo -> eira:huellas:archivo
- huella_fila: HMAC-SHA256 de la fila canonica -> eira:huellas:fila

"Mismo contenido" no necesita huella propia: se deduce de que todas las
filas del archivo ya estaban contadas en eira:huellas:fila y pertenecen a
una misma fuente.

La fila canonica no depende del orden de columnas, del formato (xlsx/csv)
ni del encabezado: id_eira | nombre_norm | municipio | servicio |
tipo_registro | fecha | asistio | cantidad.
"""
import hashlib
import hmac
import os
from collections import Counter
from datetime import datetime

from .leer import norm

H_ARCHIVO = "eira:huellas:archivo"
H_FILA = "eira:huellas:fila"


def clave_hmac() -> bytes:
    return os.environ.get("IMPACTO_HMAC_KEY", "eira-demo-hmac").encode()


def huella_bytes(contenido: bytes) -> str:
    return hashlib.sha256(contenido).hexdigest()


def _t(v) -> str:
    """A texto; NaN/None quedan como cadena vacia."""
    if v is None or (isinstance(v, float) and v != v):
        return ""
    return str(v)


def huella_fila(fila: dict, clave: bytes | None = None) -> str:
    clave = clave or clave_hmac()
    # Reportes sin persona: la huella es todo el contenido de la fila.
    if fila.get("contenido_fila"):
        return hmac.new(clave, ("cruda|" + fila["contenido_fila"]).encode(),
                        hashlib.sha256).hexdigest()
    cant = fila.get("cantidad", 1)
    cant = 1.0 if cant != cant else float(cant)  # NaN -> 1
    cant_txt = str(int(cant)) if cant == int(cant) else f"{cant:.4f}"
    canon = "|".join([
        _t(fila.get("id_eira")),
        _t(fila.get("nombre_norm")),
        _t(fila.get("municipio_clave")) or norm(fila.get("ciudad")),
        norm(fila.get("servicio")),
        _t(fila.get("tipo_registro")),
        _t(fila.get("fecha")),
        "1" if fila.get("asistio") else "0",
        cant_txt,
    ])
    return hmac.new(clave, canon.encode(), hashlib.sha256).hexdigest()


def _info_fuente(v, fuente_id: str) -> dict:
    return v.hgetall(f"eira:fuente:{fuente_id}") or {}


def _fecha_linda(iso: str) -> str:
    from .leer import MESES
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return f"{d.day} {MESES[d.month - 1]}"
    except (ValueError, IndexError):
        return str(iso)[:10]


def evaluar(v, huella_b: str, huellas_f: list[str]) -> dict:
    """Nivel de duplicado del archivo. Lee (no escribe) las huellas globales."""
    unicas = list(dict.fromkeys(huellas_f))
    veredicto = {"nivel": "distinto", "fuente_original": "", "mensaje": "",
                 "coinciden": 0, "total": len(unicas)}

    previa = v.hget(H_ARCHIVO, huella_b)
    if previa:
        info = _info_fuente(v, previa)
        veredicto.update(
            nivel="identico", fuente_original=previa, coinciden=len(unicas),
            mensaje=(f"Este archivo ya se cargó el {_fecha_linda(info.get('cargada_en', ''))} "
                     f"como '{info.get('nombre', previa)}'. No se vuelve a cargar."))
        return veredicto

    if not unicas:
        return veredicto

    duenos = [x for x in v.hmget(H_FILA, unicas) if x]
    veredicto["coinciden"] = len(duenos)
    por_fuente = Counter(d.split(":")[0] for d in duenos)

    if len(duenos) == len(unicas) and len(por_fuente) == 1:
        # Todas las filas ya estaban y son de una misma fuente: es el mismo
        # contenido con otro formato o vuelto a guardar.
        fuente_top = por_fuente.most_common(1)[0][0]
        info = _info_fuente(v, fuente_top)
        veredicto.update(
            nivel="mismo_contenido", fuente_original=fuente_top,
            mensaje=(f"Mismo contenido que '{info.get('nombre', fuente_top)}' "
                     "(archivo vuelto a guardar o exportado). No hay nada nuevo."))
        return veredicto

    fuente_top, coinciden_top = por_fuente.most_common(1)[0] if por_fuente else ("", 0)
    ratio = len(duenos) / len(unicas)
    info = _info_fuente(v, fuente_top)
    nombre_top = info.get("nombre", fuente_top)

    if len(duenos) == len(unicas):
        veredicto.update(nivel="traslape_parcial", fuente_original=fuente_top, mensaje=(
            f"Todas las filas ya estaban en otros reportes (la mayoría en "
            f"'{nombre_top}'). Se omiten."))
        return veredicto

    nuevas = len(unicas) - len(duenos)
    if ratio >= 0.9 and duenos:
        veredicto.update(nivel="version_nueva", fuente_original=fuente_top, mensaje=(
            f"Parece una versión nueva de '{nombre_top}': {len(duenos)} filas ya estaban "
            f"y se omiten; se agregan {nuevas}."))
    elif ratio >= 0.3:
        veredicto.update(nivel="traslape_parcial", fuente_original=fuente_top, mensaje=(
            f"Comparte {len(duenos)} filas con '{nombre_top}'. Se cuentan una sola vez. "
            "Revísalas en Calidad si eran servicios distintos."))
    elif duenos:
        veredicto["mensaje"] = (f"Se agregaron {nuevas} filas; {len(duenos)} ya estaban "
                               "en otros reportes y se omiten.")
    else:
        veredicto["mensaje"] = f"Se agregaron {nuevas} filas."
    return veredicto
