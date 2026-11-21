"""Pruebas de los reportes de prueba (Tarea 2): existen, tienen los
encabezados esperados y cuadran con esperado.json."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import pandas as pd
import pytest

REPO = Path(__file__).resolve().parent.parent
REPORTES = REPO / "reportes"

ARCHIVOS = ["tamizaje-rosa.xlsx", "melenas-en-movimiento.xlsx", "nutricion.xlsx",
            "reporte_final_2.xlsx", "tamizaje-rosa-reguardado.xlsx",
            "tamizaje-rosa.csv", "tamizaje-rosa_v2.xlsx"]


@pytest.fixture(scope="module")
def esperado():
    return json.loads((REPORTES / "esperado.json").read_text(encoding="utf-8"))


def test_existen_los_siete():
    for nombre in ARCHIVOS + ["esperado.json"]:
        assert (REPORTES / nombre).is_file(), nombre


def test_encabezados_de_cada_excel():
    t = pd.read_excel(REPORTES / "tamizaje-rosa.xlsx")
    assert list(t.columns) == ["ID", "Nombre", "Estudio", "Edad", "Ciudad",
                               "Asistencia", "Fecha"]
    m = pd.read_excel(REPORTES / "melenas-en-movimiento.xlsx", header=2)
    assert list(m.columns) == ["ID", "Nombre", "Edad", "Ciudad", "Fecha",
                               "Tipo", "Largo (cm)"]
    assert len(m) == 81  # 80 filas + fila TOTAL
    assert m["Tipo"].value_counts().to_dict() == \
        {"Donación de trenza": 60, "Entrega de peluca": 20}
    n = pd.read_excel(REPORTES / "nutricion.xlsx")
    assert "Tipo de servicio" in n.columns


def test_esperado_tiene_las_cifras_del_plan(esperado):
    a = esperado["archivos"]
    assert a["tamizaje-rosa.xlsx"]["asistencias"] == 120
    assert a["melenas-en-movimiento.xlsx"]["donaciones"] == 60
    assert a["melenas-en-movimiento.xlsx"]["entregas"] == 20
    assert a["melenas-en-movimiento.xlsx"]["sin_id"] == 12
    assert a["nutricion.xlsx"]["asistencias"] == 40
    g = esperado["globales"]
    assert g["pares_mismo_id"] == 2
    assert g["variantes_de_nombre"] == 3
    assert g["filas_compartidas_nutricion"] == 30
    assert g["cruce_tamizaje_melenas"] == 15


def test_copia_identica_y_reguardado():
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    assert sha(REPORTES / "reporte_final_2.xlsx") == sha(REPORTES / "tamizaje-rosa.xlsx")
    assert sha(REPORTES / "tamizaje-rosa-reguardado.xlsx") != sha(REPORTES / "tamizaje-rosa.xlsx")


def test_generador_determinista(tmp_path):
    subprocess.run([sys.executable, "scripts/generar_reportes.py", str(tmp_path)],
                   cwd=REPO, check=True, capture_output=True)
    esp2 = json.loads((tmp_path / "esperado.json").read_text(encoding="utf-8"))
    esp1 = json.loads((REPORTES / "esperado.json").read_text(encoding="utf-8"))
    assert esp1 == esp2
    # El contenido del CSV es byte a byte igual entre corridas.
    assert (tmp_path / "tamizaje-rosa.csv").read_bytes() == \
           (REPORTES / "tamizaje-rosa.csv").read_bytes()
    # Y el xlsx trae exactamente las mismas celdas.
    a = pd.read_excel(REPORTES / "tamizaje-rosa.xlsx")
    b = pd.read_excel(tmp_path / "tamizaje-rosa.xlsx")
    pd.testing.assert_frame_equal(a, b)
