"""Pruebas de la Tarea 4: provisionamiento de Metabase.

Necesitan Metabase corriendo (bash metabase/arrancar.sh) y una base SQLite
creada con metabase/datos_prueba.py (y una vacía con --vacia).

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


pytestmark = pytest.mark.skipif(not viva(), reason="Metabase no corre en " + BASE)


@pytest.fixture(scope="module")
def enlaces():
    return json.loads(ENLACES.read_text())


def test_enlaces_tienen_las_dos_direcciones_y_responden(enlaces):
    assert "impacto" in enlaces and "calidad" in enlaces
    for clave in ("impacto", "calidad"):
        r = requests.get(enlaces[clave], timeout=30)
        assert r.status_code == 200, f"{clave}: {r.status_code}"


def test_con_base_vacia_los_tableros_responden():
    # Entorno "blanco": SQLite solo con el esquema, sin datos.
    subprocess.run(
        ["uv", "run", str(METABASE / "datos_prueba.py"), "--vacia", "--db", str(DB_VACIA)],
        cwd=RAIZ, check=True,
    )
    provisionar("--entorno", "blanco", "--db", str(DB_VACIA))
    enlaces = json.loads(ENLACES.read_text())
    blanco = enlaces["entornos"]["blanco"]
    for clave in ("impacto", "calidad"):
        r = requests.get(blanco[clave], timeout=30)
        assert r.status_code == 200, f"{clave} (blanco): {r.status_code}"


def test_provisionar_dos_veces_no_duplica():
    provisionar()
    provisionar()
    # Cuenta tableros llamados "Impacto" y "Calidad" vía la API con la sesión admin
    creds = json.loads((RAIZ / ".metabase" / "credenciales.json").read_text())
    s = requests.post(f"{BASE}/api/session",
                      json={"username": creds["email"], "password": creds["password"]}, timeout=30).json()
    r = requests.get(f"{BASE}/api/dashboard", headers={"X-Metabase-Session": s["id"]}, timeout=30)
    nombres = [d["name"] for d in r.json() if not d.get("archived")]
    assert nombres.count("Impacto") == 1, nombres
    assert nombres.count("Calidad") == 1, nombres


def test_cada_pregunta_consulta_solo_vistas():
    for t in TABLEROS["tableros"]:
        for p in t["preguntas"]:
            tablas = re.findall(r"(?:from|join)\s+([A-Za-z_][\w]*)", p["sql"], re.IGNORECASE)
            assert tablas, f"{p['id']}: no referencia ninguna vista"
            for tabla in tablas:
                assert tabla.startswith("v_"), f"{p['id']} consulta «{tabla}», que no es una vista v_*"
            for prohibida in ("registros", "personas", "fuentes", "anomalias", "pares_persona"):
                assert not re.search(rf"(?:from|join)\s+{prohibida}\b", p["sql"], re.IGNORECASE), \
                    f"{p['id']} lee la tabla {prohibida} directamente"


def test_base_vacia_no_rompe_las_vistas():
    db = sqlite3.connect(DB_VACIA if DB_VACIA.exists() else RAIZ / "data" / "impacto.sqlite")
    for vista in ("v_conteos", "v_personas_por_ciudad", "v_personas_por_programa",
                  "v_edad", "v_cobertura", "v_calidad", "v_cruce_programas",
                  "v_pares_pendientes"):
        db.execute(f"SELECT * FROM {vista} LIMIT 1").fetchall()  # no lanza
