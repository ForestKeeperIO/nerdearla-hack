"""Pruebas de la Tarea 4: provisionamiento de Metabase.

Necesitan Metabase corriendo (bash metabase/arrancar.sh) y una base SQLite
creada con metabase/construir_demo.py (y una vacía con --vacia).

    uv run --with requests,pytest pytest metabase/test_metabase.py
"""
import json
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
import requests

RAIZ = Path(__file__).resolve().parent.parent
METABASE = RAIZ / "metabase"
BASE = os.environ.get("METABASE_URL", "http://127.0.0.1:3200").rstrip("/")
ENLACES = METABASE / "enlaces.json"
TABLEROS = json.loads((METABASE / "tableros.json").read_text())
DB_VACIA = RAIZ / "data" / "impacto-vacia.sqlite"
VISTAS = ("v_conteos", "v_personas_por_programa", "v_objetos", "v_global",
          "v_presencia", "v_presencia_municipios", "v_calidad",
          "v_pares_pendientes", "v_cruce_programas", "v_edad")


def provisionar(*args: str) -> None:
    subprocess.run(
        ["uv", "run", "--with", "requests", str(METABASE / "provisionar.py"), *args],
        cwd=RAIZ, check=True, capture_output=True, text=True, timeout=300,
    )


def viva() -> bool:
    try:
        return requests.get(f"{BASE}/api/health", timeout=5).ok
    except requests.RequestException:
        return False


def sesion() -> str:
    creds = json.loads((RAIZ / ".metabase" / "credenciales.json").read_text())
    r = requests.post(f"{BASE}/api/session",
                      json={"username": creds["email"], "password": creds["password"]},
                      timeout=30)
    return r.json()["id"]


pytestmark = pytest.mark.skipif(not viva(), reason="Metabase no corre en " + BASE)


@pytest.fixture(scope="module")
def enlaces():
    return json.loads(ENLACES.read_text())


def test_enlaces_tienen_las_direcciones_y_responden(enlaces):
    for clave in ("impacto", "calidad", "impacto_por_programa"):
        assert clave in enlaces, f"falta {clave} en enlaces.json"
    for clave in ("impacto", "calidad"):
        r = requests.get(enlaces[clave], timeout=30)
        assert r.status_code == 200, f"{clave}: {r.status_code}"


def test_url_filtrada_por_programa_responde(enlaces):
    plantilla = enlaces["impacto_por_programa"]
    assert "{programa}" in plantilla
    for programa in ("tamizaje-rosa", "melenas-en-movimiento"):
        r = requests.get(plantilla.format(programa=programa), timeout=30)
        assert r.status_code == 200, f"{programa}: {r.status_code}"


def test_un_solo_juego_de_enlaces_y_responde(enlaces):
    # No se reprovisiona aquí: el entorno «blanco» apunta a la base de la
    # aplicación en línea y esta prueba no debe cambiarle la conexión.
    principal = enlaces["entornos"][enlaces["principal"]]
    assert list(enlaces["entornos"]) == [enlaces["principal"]], "un solo juego de enlaces públicos"
    for clave in ("impacto", "calidad"):
        r = requests.get(principal[clave], timeout=30)
        assert r.status_code == 200, f"{clave}: {r.status_code}"


def test_base_vacia_se_construye():
    subprocess.run(
        ["uv", "run", "python", str(METABASE / "construir_demo.py"), "--vacia", "--db", str(DB_VACIA)],
        cwd=RAIZ, check=True,
    )


def test_provisionar_dos_veces_no_duplica():
    provisionar("--entorno", "real")
    provisionar("--entorno", "real")
    # Un "Impacto" y un "Calidad" por colección (real y blanco), nada más.
    sid = sesion()
    h = {"X-Metabase-Session": sid}
    nombres = [(d["name"], d.get("collection_id"))
               for d in requests.get(f"{BASE}/api/dashboard", headers=h, timeout=30).json()
               if not d.get("archived") and d["name"] in ("Impacto", "Calidad")]
    assert len(nombres) == 4, nombres
    assert "127.0.0.1" not in ENLACES.read_text() or not (RAIZ / ".metabase" / "url-publica").exists()
    for nombre in ("Impacto", "Calidad"):
        cols = sorted(c for n, c in nombres if n == nombre)
        assert len(cols) == 2 and cols[0] != cols[1], nombres


def test_sin_sufijos_de_entorno_en_titulos():
    sid = sesion()
    h = {"X-Metabase-Session": sid}
    for d in requests.get(f"{BASE}/api/dashboard", headers=h, timeout=30).json():
        if not d.get("archived"):
            assert not re.search(r"\s*[\[(](real|blanco)[\])]\s*$", d["name"]), d["name"]
    for c in requests.get(f"{BASE}/api/card", headers=h,
                          params={"f": "all"}, timeout=30).json():
        assert not re.search(r"\s*\[(real|blanco)\]\s*$", c["name"]), c["name"]


def test_cada_pregunta_consulta_solo_vistas():
    for t in TABLEROS["tableros"]:
        for p in t["preguntas"]:
            if p.get("texto"):
                continue  # tarjeta de texto, sin consulta
            tablas = re.findall(r"(?:from|join)\s+([A-Za-z_][\w]*)", p["sql"], re.IGNORECASE)
            assert tablas, f"{p['id']}: no referencia ninguna vista"
            for tabla in tablas:
                assert tabla.startswith("v_"), f"{p['id']} consulta «{tabla}», que no es una vista v_*"
            for prohibida in ("registros", "personas", "fuentes", "anomalias",
                              "pares_persona", "identidades", "municipios"):
                assert not re.search(rf"(?:from|join)\s+{prohibida}\b", p["sql"], re.IGNORECASE), \
                    f"{p['id']} lee la tabla {prohibida} directamente"


def test_las_series_usan_la_paleta_de_eira():
    paleta = {"#7d3b3b", "#6a2b51", "#7e8ba3"}
    for t in TABLEROS["tableros"]:
        for p in t["preguntas"]:
            for cfg in (p.get("visualization_settings") or {}).get("series_settings", {}).values():
                assert cfg.get("color") in paleta, (p["id"], cfg.get("color"))
            for fmt in (p.get("visualization_settings") or {}).get("table.column_formatting", []):
                assert fmt.get("color") in paleta, (p["id"], fmt.get("color"))


def test_base_vacia_no_rompe_las_vistas():
    db = sqlite3.connect(DB_VACIA if DB_VACIA.exists() else RAIZ / "data" / "impacto.sqlite")
    for vista in VISTAS:
        db.execute(f"SELECT * FROM {vista} LIMIT 1").fetchall()  # no lanza
