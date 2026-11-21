"""Mapeo de encabezados heterogéneos al modelo común."""
from __future__ import annotations

import difflib

from .texto import norm

# Campo común → encabezados conocidos (ya normalizados). Los encabezados reales de EIRA
# siguen siendo un supuesto: ampliar aquí cuando lleguen sus archivos.
SINONIMOS: dict[str, list[str]] = {
    "id_eira": ["id eira", "id", "id de eira", "clave eira", "id paciente", "id usuaria",
                "id usuario", "clave", "identificador", "id beneficiaria", "id unico"],
    "folio": ["folio", "folio nfc", "folio tarjeta", "folio de tarjeta", "tarjeta"],
    "nombre": ["nombre", "nombre completo", "paciente", "beneficiaria", "participante",
               "usuaria", "nombre de la paciente", "nombre y apellidos", "nombre de la participante"],
    "fecha_nacimiento": ["fecha de nacimiento", "fecha nacimiento", "fecha de nac", "fecha nac",
                         "nacimiento", "fnac", "f nacimiento"],
    "edad": ["edad", "edad anos", "edad en anos", "anos cumplidos"],
    "ciudad": ["ciudad", "municipio", "localidad", "comunidad", "lugar", "municipio de residencia"],
    "servicio": ["tipo de servicio", "servicio", "tipo servicio", "tipo de atencion", "atencion",
                 "actividad", "taller", "servicio recibido"],
    "estudio": ["estudio", "tipo de estudio", "estudio realizado"],
    "fecha": ["fecha", "fecha de servicio", "fecha servicio", "fecha de atencion", "fecha de la jornada",
              "fecha de actividad", "fecha de asistencia", "fecha del evento", "dia"],
    "asistencia": ["asistencia", "asistio", "asistio si no", "presente", "asistencia si no"],
    "tipo_registro": ["tipo de registro", "tipo registro", "movimiento", "tipo de movimiento", "concepto"],
    "cantidad": ["cantidad", "piezas", "insumos entregados", "numero de piezas", "cantidad entregada",
                 "total entregado", "unidades", "trenzas", "numero de trenzas", "trenzas donadas"],
}
UMBRAL = 0.75


def _prob(encabezado: str, sinonimo: str) -> float:
    if encabezado == sinonimo:
        return 1.0
    te, ts = set(encabezado.split()), set(sinonimo.split())
    if ts and ts <= te:
        return 0.7 + 0.3 * len(ts) / len(te)
    return difflib.SequenceMatcher(None, encabezado, sinonimo).ratio() * 0.95


def mapear(encabezados: list) -> list[dict]:
    """Devuelve [{encabezado, campo, probabilidad, indice}] con cada campo usado una sola vez."""
    candidatos = []
    for i, enc in enumerate(encabezados):
        n = norm(enc)
        if not n:
            continue
        for campo, sins in SINONIMOS.items():
            p = max(_prob(n, s) for s in sins)
            if p >= UMBRAL:
                candidatos.append((p, i, campo))
    candidatos.sort(key=lambda t: (-t[0], t[1]))
    usados_c, usados_i, salida = set(), set(), []
    for p, i, campo in candidatos:
        if campo in usados_c or i in usados_i:
            continue
        usados_c.add(campo)
        usados_i.add(i)
        salida.append({"encabezado": str(encabezados[i]).strip(), "campo": campo,
                       "probabilidad": round(p, 2), "indice": i})
    return sorted(salida, key=lambda d: d["indice"])
