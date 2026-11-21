"""Lectura de Excel (.xlsx) y CSV con los problemas típicos de archivos reales."""
from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field

from .mapeo import mapear
from .texto import es_vacio, norm


class ErrorArchivo(Exception):
    """Problema del archivo, con un mensaje claro en español para la usuaria."""


@dataclass
class Tabla:
    formato: str                      # 'xlsx' | 'csv'
    hoja: str | None
    encabezados: list
    filas: list[tuple[int, list]]     # (número de fila en el archivo, celdas)
    hojas_ignoradas: list[str] = field(default_factory=list)
    totales_excluidas: int = 0


def _decodificar(contenido: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return contenido.decode(enc)
        except UnicodeDecodeError:
            continue
    return contenido.decode("latin-1")


def _matrices(contenido: bytes) -> tuple[str, dict[str, list[list]]]:
    if contenido[:4] == b"\xd0\xcf\x11\xe0":
        raise ErrorArchivo("Este archivo está en formato Excel antiguo (.xls). "
                           "Guárdalo como .xlsx o CSV y vuelve a subirlo.")
    if contenido[:2] == b"PK":
        try:
            from openpyxl import load_workbook
            wb = load_workbook(io.BytesIO(contenido), data_only=True)
        except Exception as e:  # archivo dañado, protegido con contraseña, etc.
            raise ErrorArchivo("No pude abrir el archivo de Excel. ¿Está dañado o tiene contraseña?") from e
        hojas = {}
        for ws in wb.worksheets:
            m = [list(r) for r in ws.iter_rows(values_only=True)]
            # Celdas combinadas: openpyxl deja nulas todas menos la primera; se rellenan.
            for rango in ws.merged_cells.ranges:
                valor = ws.cell(rango.min_row, rango.min_col).value
                for r in range(rango.min_row, rango.max_row + 1):
                    for c in range(rango.min_col, rango.max_col + 1):
                        if r - 1 < len(m) and c - 1 < len(m[r - 1]):
                            m[r - 1][c - 1] = valor
            hojas[ws.title] = m
        return "xlsx", hojas
    texto = _decodificar(contenido)
    if not texto.strip():
        raise ErrorArchivo("El archivo está vacío.")
    try:
        delim = csv.Sniffer().sniff(texto[:4096], delimiters=",;\t|").delimiter
    except csv.Error:
        delim = ","
    return "csv", {"CSV": [row for row in csv.reader(io.StringIO(texto), delimiter=delim)]}


def _es_total(celdas: list) -> bool:
    return any(isinstance(c, str) and re.match(r"^(sub\s*)?total(es)?\b", norm(c)) for c in celdas if c)


def leer_tabla(contenido: bytes) -> Tabla:
    formato, hojas = _matrices(contenido)
    mejor = None  # (puntaje, filas, hoja, fila_encabezado)
    for nombre, m in hojas.items():
        for i, fila in enumerate(m[:25]):
            puntaje = sum(1 for d in mapear(fila) if d["probabilidad"] >= 0.75)
            if mejor is None or (puntaje, len(m)) > (mejor[0], len(hojas[mejor[2]])):
                mejor = (puntaje, m, nombre, i)
    if mejor is None or mejor[0] < 2:
        raise ErrorArchivo("No reconocí los encabezados del archivo. Necesito al menos dos columnas "
                           "como nombre, ID, fecha, municipio o servicio en la primera hoja con datos.")
    _, m, hoja, i_enc = mejor
    encabezados = m[i_enc]
    filas, totales = [], 0
    for j in range(i_enc + 1, len(m)):
        celdas = m[j]
        if all(es_vacio(c) for c in celdas):
            continue
        if _es_total(celdas):
            totales += 1
            continue
        filas.append((j + 1, celdas))
    if not filas:
        raise ErrorArchivo("El archivo tiene encabezados pero ninguna fila de datos.")
    return Tabla(formato, hoja if formato == "xlsx" else None, encabezados, filas,
                 [h for h in hojas if h != hoja], totales)
