"""Catálogos de municipios y servicios para normalizar valores."""
from __future__ import annotations

import csv
from pathlib import Path

from .texto import norm, similitud

RAIZ = Path(__file__).resolve().parents[2]

SERVICIOS = {
    "Papanicolaou": ["papanicolaou", "papanicolau", "pap", "citologia", "citologia cervical"],
    "Ultrasonido de mama": ["ultrasonido de mama", "ultrasonido", "usg", "ultrasonido mamario"],
    "Mastografía": ["mastografia", "mamografia", "mastografia bilateral"],
    "Exploración clínica": ["exploracion clinica", "exploracion mamaria", "exploracion clinica de mama"],
    "Taller de salud": ["taller de salud", "taller", "platica", "plática de salud"],
    "Valoración nutricional": ["valoracion nutricional", "nutricion", "nutriologa", "consulta de nutricion"],
}


class Catalogo:
    """Valor canónico por nombre normalizado, con coincidencia aproximada (≥ 0.86)."""

    def __init__(self, canonicos: dict[str, list[str]]):
        self.mapa = {}
        for canon, alias in canonicos.items():
            self.mapa[norm(canon)] = canon
            for a in alias:
                self.mapa[norm(a)] = canon

    def resolver(self, crudo: str) -> tuple[str | None, str]:
        """(canónico, 'exacto'|'aproximado'|'desconocido')."""
        n = norm(crudo)
        if n in self.mapa:
            return self.mapa[n], "exacto"
        mejor, ratio = None, 0.0
        for k, canon in self.mapa.items():
            r = similitud(n, k)
            if r > ratio:
                mejor, ratio = canon, r
        if mejor and ratio >= 0.86:
            return mejor, "aproximado"
        return None, "desconocido"


def cargar_ciudades(extra: Path | None = None) -> Catalogo:
    nombres: list[str] = []
    csv_mun = RAIZ / "publicos" / "jalisco_mun_denominadores_2020.csv"
    if csv_mun.exists():
        with open(csv_mun, encoding="utf-8") as f:
            nombres += [r["nom_mun"] for r in csv.DictReader(f)]
    extra = extra or (RAIZ / "py" / "catalogos" / "ciudades_extra.txt")
    if extra.exists():
        nombres += [l.strip() for l in extra.read_text(encoding="utf-8").splitlines()
                    if l.strip() and not l.startswith("#")]
    return Catalogo({n: [] for n in nombres})


def cargar_servicios() -> Catalogo:
    return Catalogo(SERVICIOS)
