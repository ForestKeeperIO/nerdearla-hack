#!/usr/bin/env python3
"""Deriva el reporte de unidades medicas de Jalisco a partir del catalogo
maestro CLUES (Clave Unica de Establecimientos de Salud) de la Secretaria de
Salud / DGIS, octubre 2026.

Uso (requiere openpyxl):
    uv run --with openpyxl python3 scripts/derivar_clues_jalisco.py <ruta a ESTABLECIMIENTO_SALUD_202610.xlsx> <dir salida>
"""
import csv
import sys

import openpyxl

ENT_JALISCO = "14"

# (encabezado en CLUES, encabezado en el reporte)
COLUMNAS = [
    ("CLUES", "clues"),
    ("CLAVE DE LA INSTITUCION", "clave_institucion"),
    ("NOMBRE DE LA INSTITUCION", "institucion"),
    ("CLAVE DE LA ENTIDAD", "clave_entidad"),
    ("ENTIDAD", "entidad"),
    ("CLAVE DEL MUNICIPIO", "clave_municipio"),
    ("MUNICIPIO", "municipio"),
    ("CLAVE DE LA LOCALIDAD", "clave_localidad"),
    ("LOCALIDAD", "localidad"),
    ("JURISDICCION", "jurisdiccion"),
    ("CLAVE DEL TIPO ESTABLECIMIENTO", "clave_tipo_establecimiento"),
    ("NOMBRE TIPO ESTABLECIMIENTO", "tipo_establecimiento"),
    ("CLAVE DE TIPOLOGIA", "clave_tipologia"),
    ("NOMBRE DE TIPOLOGIA", "tipologia"),
    ("NOMBRE DE LA UNIDAD", "nombre_unidad"),
    ("ESTATUS DE OPERACION", "estatus_operacion"),
    ("NIVEL ATENCION", "nivel_atencion"),
    ("ESTATUS DE CERTIFICACION", "estatus_certificacion"),
]


def main():
    origen, salida = sys.argv[1], sys.argv[2]
    wb = openpyxl.load_workbook(origen, read_only=True)
    ws = wb["CLUES_202610"]
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h else "" for h in next(it)]

    idx = {}
    for orig, _ in COLUMNAS:
        if orig in header:
            idx[orig] = header.index(orig)

    disponibles = [(o, d) for o, d in COLUMNAS if o in idx]
    faltantes = [o for o, _ in COLUMNAS if o not in idx]
    if faltantes:
        print(f"Aviso: columnas no encontradas y omitidas: {faltantes}", file=sys.stderr)

    filas = []
    for row in it:
        if str(row[idx["CLAVE DE LA ENTIDAD"]]).strip() != ENT_JALISCO:
            continue
        reg = {d: ("" if row[idx[o]] is None else row[idx[o]]) for o, d in disponibles}
        reg["cvegeo"] = f'{reg["clave_entidad"]}{str(reg["clave_municipio"]).zfill(3)}'
        filas.append(reg)

    out = f"{salida}/clues_unidades_salud_jalisco_2026.csv"
    cols = [d for _, d in disponibles] + ["cvegeo"]
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(filas)
    instituciones = len({r["institucion"] for r in filas})
    municipios = len({r["cvegeo"] for r in filas})
    print(f"{out}: {len(filas)} filas ({instituciones} instituciones, {municipios} municipios)")


if __name__ == "__main__":
    main()
