"""Vinculacion de personas (capa 3 del plan).

Reglas:
- Mismo ID de EIRA y mismo nombre normalizado: misma persona, sin preguntar
  (el identificador opaco es deterministico, asi que sale solo).
- Mismo ID y nombre distinto: dos personas y un par pendiente para que una
  humana decida. rapidfuzz clasifica el motivo: variante de escritura o
  personas distintas.
- Sin ID de EIRA: la fila queda SIN persona identificada (persona_id nulo,
  cuenta en eira:sinid). No se une solo por nombre: dos "María López" de
  coordinaciones distintas no son forzosamente la misma.

El nombre nunca se guarda: las claves son HMAC. Los nombres solo viven en
memoria del proceso (_NOMBRES) para poder comparar variantes; si el proceso
arranca de nuevo, los pares siguen generandose (con probabilidad 0.5) pero el
motivo sale generico. La similitud se guarda como probabilidad.
"""
import hmac
import hashlib
from dataclasses import dataclass, field

import pandas as pd
from rapidfuzz import fuzz

from .huellas import clave_hmac

_NOMBRES: dict[str, str] = {}       # nombre_clave -> nombre_norm (solo RAM)
_PERSONAS: dict[str, dict] = {}     # persona_id -> {clave, nombre_norm, nac} (solo RAM)


def _h(dato: str) -> str:
    return hmac.new(clave_hmac(), dato.encode(), hashlib.sha256).hexdigest()


def _nac_del_id(id_eira: str) -> str | None:
    if len(id_eira) == 11:
        return f"{id_eira[3:7]}-{id_eira[7:9]}-{id_eira[9:11]}"
    return None


def _etiqueta(nombre_norm: str, ciudad: str, edad) -> str:
    ini = ". ".join(p[0].upper() for p in nombre_norm.split()[:4] if p) + "."
    partes = [ini]
    if ciudad:
        partes.append(ciudad)
    if edad:
        partes.append(f"{edad} años")
    return " · ".join(partes)


@dataclass
class Vinculacion:
    persona_ids: pd.Series
    pares: list[dict] = field(default_factory=list)
    personas_nuevas: list[dict] = field(default_factory=list)
    identidades_nuevas: list[dict] = field(default_factory=list)


def _similitud(nombre_clave_a: str, nombre_clave_b: str) -> float | None:
    """Ratio 0-1 si ambos nombres estan en memoria; None si falta alguno."""
    a, b = _NOMBRES.get(nombre_clave_a), _NOMBRES.get(nombre_clave_b)
    if a is None or b is None:
        return None
    return fuzz.token_sort_ratio(a, b) / 100.0


def vincular(df: pd.DataFrame, existentes: pd.DataFrame,
             fuente_id: str = "") -> Vinculacion:
    """Asigna persona_id a cada fila y propone pares pendientes.

    existentes: DataFrame de la tabla identidades
    (clave, nombre_clave, persona_id, etiqueta, fuente, fila, nacimiento).
    """
    conocidas: dict[tuple[str, str], dict] = {}
    if existentes is not None and len(existentes):
        for r in existentes.itertuples(index=False):
            conocidas[(r.clave, r.nombre_clave)] = {
                "persona_id": r.persona_id, "etiqueta": getattr(r, "etiqueta", ""),
                "fuente": getattr(r, "fuente", ""), "fila": getattr(r, "fila", 0),
                "nombre_clave": r.nombre_clave}

    por_clave: dict[str, list[dict]] = {}
    for (c, _n), info in conocidas.items():
        por_clave.setdefault(c, []).append(info)

    res = Vinculacion(persona_ids=pd.Series([None] * len(df), index=df.index, dtype=object))
    pares_vistos: set[tuple[str, str]] = set()
    nuevos_ids: dict[tuple[str, str], str] = {}

    for idx, fila in df.iterrows():
        id_eira = fila.get("id_eira") or ""
        nombre_norm = fila.get("nombre_norm") or ""
        if not id_eira:
            continue  # sin ID no se une por nombre: registro sin persona

        clave = _h("id|" + id_eira)
        certeza = "id"
        nacimiento = _nac_del_id(id_eira)
        nombre_clave = _h("nom|" + nombre_norm) if nombre_norm else clave
        if nombre_norm:
            _NOMBRES[nombre_clave] = nombre_norm

        if (clave, nombre_clave) in conocidas:
            res.persona_ids[idx] = conocidas[(clave, nombre_clave)]["persona_id"]
            continue
        if (clave, nombre_clave) in nuevos_ids:
            res.persona_ids[idx] = nuevos_ids[(clave, nombre_clave)]
            continue

        persona_id = "p" + _h(clave + "|" + nombre_clave)[:15]
        nuevos_ids[(clave, nombre_clave)] = persona_id
        res.persona_ids[idx] = persona_id
        etiqueta = _etiqueta(nombre_norm, fila.get("ciudad") or "", fila.get("edad"))

        res.personas_nuevas.append({
            "id": persona_id, "certeza": certeza,
            "fecha_nacimiento": nacimiento, "ciudad": fila.get("ciudad") or ""})
        res.identidades_nuevas.append({
            "clave": clave, "nombre_clave": nombre_clave, "persona_id": persona_id,
            "etiqueta": etiqueta, "fuente": fuente_id, "fila": int(fila["fila"]),
            "nacimiento": nacimiento})
        _PERSONAS[persona_id] = {"clave": clave, "nombre_norm": nombre_norm,
                                 "nac": nacimiento, "etiqueta": etiqueta,
                                 "fuente": fuente_id, "fila": int(fila["fila"])}

        # Mismo ID (misma clave), otro nombre -> par pendiente.
        for otra in por_clave.get(clave, []):
            if otra["persona_id"] == persona_id:
                continue
            par = tuple(sorted([otra["persona_id"], persona_id]))
            if par in pares_vistos:
                continue
            pares_vistos.add(par)
            sim = _similitud(otra["nombre_clave"], nombre_clave)
            prob = round(max(sim or 0.5, 0.5), 3)
            motivo = ("Posible variante de escritura" if (sim or 0) >= 0.9
                      else "Mismo ID, nombres distintos")
            res.pares.append({
                "persona_a": otra["persona_id"], "persona_b": persona_id,
                "probabilidad": prob, "motivo": motivo,
                "a": {"fuente": otra["fuente"], "fila": otra["fila"],
                      "etiqueta": otra["etiqueta"]},
                "b": {"fuente": fuente_id, "fila": int(fila["fila"]),
                      "etiqueta": etiqueta}})
        por_clave.setdefault(clave, []).append({
            "persona_id": persona_id, "etiqueta": etiqueta, "nombre_clave": nombre_clave,
            "fuente": fuente_id, "fila": int(fila["fila"])})

    return res
