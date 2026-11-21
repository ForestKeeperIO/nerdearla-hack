"""Normalización de texto, fechas, edades, ID de EIRA y folios."""
from __future__ import annotations

import datetime as dt
import difflib
import re
import unicodedata

VACIOS = {"", "s/d", "sd", "n/a", "na", "null", "none", "nan", "-", "--", "sin dato", "sin datos", "nd"}

MESES = {
    "enero": 1, "ene": 1, "febrero": 2, "feb": 2, "marzo": 3, "mar": 3, "abril": 4, "abr": 4,
    "mayo": 5, "may": 5, "junio": 6, "jun": 6, "julio": 7, "jul": 7, "agosto": 8, "ago": 8,
    "septiembre": 9, "setiembre": 9, "sep": 9, "sept": 9, "octubre": 10, "oct": 10,
    "noviembre": 11, "nov": 11, "diciembre": 12, "dic": 12,
}
MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
PARTICULAS = {"de", "del", "la", "las", "los", "y", "e"}


def sin_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm(s) -> str:
    """Minúsculas, sin acentos ni signos, espacios colapsados."""
    if s is None:
        return ""
    t = sin_acentos(str(s)).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def es_vacio(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and v != v:  # NaN
        return True
    return str(v).strip().lower() in VACIOS


def similitud(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def fecha_es(d: dt.date) -> str:
    """'21 nov' para los mensajes que ve la usuaria."""
    return f"{d.day} {MESES_CORTOS[d.month - 1]}"


# --- Fechas ---------------------------------------------------------------

def _valida(a: int, m: int, d: int) -> dt.date | None:
    try:
        f = dt.date(a, m, d)
    except ValueError:
        return None
    return f if 1900 <= f.year <= 2100 else None


def parse_fecha(v) -> dt.date | None:
    """Acepta datetime, número de serie de Excel y textos comunes (día primero)."""
    if es_vacio(v):
        return None
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if 20000 <= v <= 60000:
            return dt.date(1899, 12, 30) + dt.timedelta(days=int(v))
        return None
    s = str(v).strip()
    if re.fullmatch(r"\d{5}(\.\d+)?", s):
        return parse_fecha(float(s))
    m = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if m:
        return _valida(int(m[1]), int(m[2]), int(m[3]))
    if re.fullmatch(r"\d{8}", s):
        return _valida(int(s[:4]), int(s[4:6]), int(s[6:]))
    m = re.match(r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})", s)
    if m:
        d, mes, a = int(m[1]), int(m[2]), int(m[3])
        if a < 100:
            a += 2000 if a < 70 else 1900
        if mes > 12 and d <= 12:  # venía mes/día
            d, mes = mes, d
        return _valida(a, mes, d)
    t = norm(s).split()
    t = [x for x in t if x != "de"]
    if len(t) >= 3 and t[0].isdigit() and t[1] in MESES and t[2].isdigit():
        a = int(t[2])
        if a < 100:
            a += 2000
        return _valida(a, MESES[t[1]], int(t[0]))
    return None


def parse_edad(v) -> int | None:
    if es_vacio(v):
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(v)
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None


def edad_en(nac: dt.date, ref: dt.date) -> int:
    return ref.year - nac.year - ((ref.month, ref.day) < (nac.month, nac.day))


# --- ID de EIRA y folio -----------------------------------------------------

def parse_id(v, hoy: dt.date | None = None) -> tuple[str, dt.date] | None:
    """ID EIRA = iniciales + AAAAMMDD. Acepta la fecha antes o después de las iniciales
    (el orden exacto sigue sin validarse con EIRA) y devuelve la forma canónica."""
    if es_vacio(v):
        return None
    s = re.sub(r"[\s\-_.]", "", sin_acentos(str(v)).upper().replace("Ñ", "N"))
    m = re.fullmatch(r"([A-Z]{2,4})(\d{8})", s) or re.fullmatch(r"(\d{8})([A-Z]{2,4})", s)
    if not m:
        return None
    ini, fecha = (m[1], m[2]) if m[1].isalpha() else (m[2], m[1])
    f = _valida(int(fecha[:4]), int(fecha[4:6]), int(fecha[6:]))
    if f is None or f > (hoy or dt.date.today()):
        return None
    return ini + fecha, f


ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_FOLIO = re.compile(r"^EIRA-([2-9A-HJKMNP-Z]{4})-([2-9A-HJKMNP-Z]{4})$")


def folio_valido(folio) -> bool:
    """Mismo algoritmo que shared/folio.ts (7 caracteres + verificador)."""
    m = _FOLIO.match(str(folio).strip().upper())
    if not m:
        return False
    todo = m[1] + m[2]
    return ALFABETO[sum(ALFABETO.index(c) for c in todo[:7]) % len(ALFABETO)] == todo[7]


# --- Nombres ----------------------------------------------------------------

def iniciales(nombre: str) -> str:
    palabras = [p for p in norm(nombre).split() if p not in PARTICULAS]
    return ". ".join(p[0].upper() for p in palabras) + "." if palabras else ""
