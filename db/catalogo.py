"""Carga de los catalogos compartidos: iniciativas y municipios.

catalogos/iniciativas.json es la unica fuente de programas, tipos de
registro y roles para el frontend, el motor y la base de reporte.
publicos/municipios_mexico.json trae el catalogo INEGI completo.
"""
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INICIATIVAS_JSON = RAIZ / "catalogos" / "iniciativas.json"
MUNICIPIOS_JSON = RAIZ / "publicos" / "municipios_mexico.json"


def norm(texto) -> str:
    """Minusculas, sin acentos, espacios colapsados."""
    if texto is None:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


@lru_cache(maxsize=1)
def catalogo() -> dict:
    return json.loads(INICIATIVAS_JSON.read_text(encoding="utf-8"))


def tipos_de_registro() -> list[dict]:
    return catalogo()["tipos_de_registro"]


def roles_de_persona() -> list[dict]:
    return catalogo()["roles_de_persona"]


def iniciativas() -> list[dict]:
    return catalogo()["iniciativas"]


def roles_impactados() -> set[str]:
    return {r["clave"] for r in roles_de_persona() if r["cuenta_como_impactada"]}


def iniciativa(valor: str) -> dict | None:
    """Resuelve la iniciativa de un trabajo: por id, o por nombre normalizado
    (el frontend viejo mandaba el nombre)."""
    valor = (valor or "").strip()
    for ini in iniciativas():
        if ini["id"] == valor:
            return ini
    nv = norm(valor)
    for ini in iniciativas():
        if norm(ini["nombre"]) == nv:
            return ini
    return None


def rol_de(ini: dict, tipo: str) -> str | None:
    return (ini.get("roles_por_tipo") or {}).get(tipo) or ini.get("rol_por_defecto")


def resolver_tipo(ini: dict, tipo_texto: str, unidad_trabajo: str) -> tuple[str, bool]:
    """Tipo de registro de una fila. Devuelve (clave, seguro).

    Orden: 1) el valor de la columna Tipo contra valores_tipo o las
    etiquetas del catalogo; 2) la unidad que trajo el trabajo si el
    programa la admite; 3) el unico tipo del programa, si solo tiene uno;
    4) el primero del programa (seguro=False -> la fila lleva anomalia).
    """
    permitidos = ini["tipos_de_registro"]
    vt = norm(tipo_texto)
    if vt:
        for valor, clave in (ini.get("valores_tipo") or {}).items():
            if norm(valor) == vt and clave in permitidos:
                return clave, True
        por_clave = {t["clave"]: t for t in tipos_de_registro()}
        for clave in permitidos:
            t = por_clave.get(clave, {})
            if vt in (norm(clave), norm(t.get("etiqueta")), norm(t.get("plural"))):
                return clave, True
    if unidad_trabajo in permitidos:
        return unidad_trabajo, True
    if len(permitidos) == 1:
        return permitidos[0], True
    if vt or unidad_trabajo == "segun_fila":
        return permitidos[0], False
    return permitidos[0], False


# --- Municipios -----------------------------------------------------------------

# Alias de uso comun -> nombre oficial normalizado (se aplican dentro del
# estado que corresponda).
ALIAS_MUNICIPIOS = {
    "ciudad guzman": "zapotlan el grande",
    "cd guzman": "zapotlan el grande",
    "zapotlan": "zapotlan el grande",
    "tlaquepaque": "san pedro tlaquepaque",
    "gdl": "guadalajara",
}


@lru_cache(maxsize=1)
def municipios() -> list[dict]:
    return json.loads(MUNICIPIOS_JSON.read_text(encoding="utf-8"))["municipios"]


@lru_cache(maxsize=1)
def municipio_por_clave() -> dict[str, dict]:
    return {m["clave"]: m for m in municipios()}


@lru_cache(maxsize=1)
def _por_estado() -> dict[str, dict[str, dict]]:
    """estado_clave -> {nombre normalizado -> municipio}."""
    res: dict[str, dict[str, dict]] = {}
    for m in municipios():
        res.setdefault(m["estado_clave"], {})[norm(m["municipio"])] = m
    return res


@lru_cache(maxsize=1)
def estado_por_nombre() -> dict[str, str]:
    """nombre de estado normalizado -> estado_clave."""
    return {norm(m["estado"]): m["estado_clave"] for m in municipios()}


def _clave_busqueda(texto: str) -> str:
    """'Cd. Guzmán' -> 'cd guzman'."""
    return re.sub(r"[^a-z0-9ñ]+", " ", norm(texto)).strip()


def resolver_lugar(ciudad: str, estado_clave: str,
                   estado_texto: str = "", municipio_clave: str = "",
                   entidad_clave: str = "", municipio_corto: str = "") -> dict:
    """Resuelve el lugar de una fila contra el catalogo INEGI.

    Devuelve dict con estado_clave, estado, municipio_clave, municipio y
    resuelto (bool). Prioridad: clave directa del archivo, luego la ciudad
    con alias dentro del estado de la fila (si trae) o del trabajo.
    """
    res = {"estado_clave": "", "estado": "", "municipio_clave": "",
           "municipio": "", "resuelto": False}
    por_clave = municipio_por_clave()

    clave = (municipio_clave or "").strip().zfill(5)
    if not clave.strip("0") and entidad_clave and municipio_corto:
        clave = f"{str(entidad_clave).strip().zfill(2)}{str(municipio_corto).strip().zfill(3)}"
    m = por_clave.get(clave)
    if m:
        res.update(estado_clave=m["estado_clave"], estado=m["estado"],
                   municipio_clave=m["clave"], municipio=m["municipio"],
                   resuelto=True)
        return res

    est_clave = (estado_clave or "").strip().zfill(2)
    et = _clave_busqueda(estado_texto)
    if et:
        if et in estado_por_nombre():
            est_clave = estado_por_nombre()[et]
        elif et.isdigit():
            est_clave = et.zfill(2)

    candidatos = _por_estado().get(est_clave, {})
    c = _clave_busqueda(ciudad)
    m = candidatos.get(c) or candidatos.get(ALIAS_MUNICIPIOS.get(c, ""))
    if m:
        res.update(estado_clave=m["estado_clave"], estado=m["estado"],
                   municipio_clave=m["clave"], municipio=m["municipio"],
                   resuelto=True)
    elif est_clave and est_clave in _por_estado():
        est = next(iter(_por_estado()[est_clave].values()))
        res.update(estado_clave=est_clave, estado=est["estado"])
    return res
