"""Catálogo de programas, tipos de registro y roles (catalogos/iniciativas.json).

Es la única fuente de nombres de programa: nada fijo en el código.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from .texto import norm

RUTA = Path(os.environ.get("EIRA_CATALOGO", Path(__file__).resolve().parents[2] / "catalogos" / "iniciativas.json"))

# Cómo se escribe cada tipo de registro en un Excel (para la columna opcional "Tipo de registro").
ALIAS_TIPO = {
    "atencion": ["atencion", "consulta"],
    "estudio": ["estudio"],
    "participacion": ["participacion", "asistencia a taller"],
    "entrega_insumo": ["entrega de insumo", "entrega de insumos", "insumo"],
    "donacion": ["donacion", "donacion de cabello", "trenza", "cabello"],
    "producto_entregado": ["producto entregado", "peluca", "peluca entregada", "entrega de peluca"],
}


@dataclass
class Iniciativa:
    id: str
    nombre: str
    tipos: list[str]
    rol_defecto: str | None
    roles_por_tipo: dict[str, str]
    en_demo: bool


class Catalogo:
    def __init__(self, ruta: Path = RUTA):
        d = json.loads(Path(ruta).read_text(encoding="utf-8"))
        self.tipos = {t["clave"]: t for t in d["tipos_de_registro"]}
        self.roles = {r["clave"]: r for r in d["roles_de_persona"]}
        self.iniciativas = {
            i["id"]: Iniciativa(i["id"], i["nombre"], i["tipos_de_registro"], i.get("rol_por_defecto"),
                                i.get("roles_por_tipo", {}), bool(i.get("en_demo")))
            for i in d["iniciativas"]}
        self._por_nombre = {norm(i.nombre): i.id for i in self.iniciativas.values()}
        self._por_nombre.update({norm(i.id): i.id for i in self.iniciativas.values()})
        self._alias_tipo = {norm(a): k for k, al in ALIAS_TIPO.items() for a in al + [k]}

    def programa(self, crudo: str) -> Iniciativa | None:
        """Acepta el id ('tamizaje-rosa') o el nombre ('Tamizaje Rosa')."""
        i = self._por_nombre.get(norm(crudo))
        return self.iniciativas[i] if i else None

    def tipo(self, crudo) -> str | None:
        return self._alias_tipo.get(norm(crudo))

    def rol(self, programa_id: str, tipo: str) -> str | None:
        ini = self.iniciativas[programa_id]
        return ini.roles_por_tipo.get(tipo, ini.rol_defecto)

    def cuenta_como_impactada(self, rol: str | None) -> bool:
        return bool(rol and self.roles.get(rol, {}).get("cuenta_como_impactada"))

    def se_cuenta_objetos(self, tipo: str) -> bool:
        return self.tipos.get(tipo, {}).get("se_cuenta") == "objetos"
