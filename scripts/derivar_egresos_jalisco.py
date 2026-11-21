#!/usr/bin/env python3
"""Deriva el reporte de egresos hospitalarios por cancer de mama (C50*) y
cervicouterino (C53*) con residencia en Jalisco, a partir de los datos abiertos
de Egresos Hospitalarios de la Secretaria de Salud (DGIS/SAEH) 2024.

Uso:
    python3 scripts/derivar_egresos_jalisco.py <ruta a ssa_egresos_2024.zip> <dir salida>

Solo usa la biblioteca estandar. El zip oficial pesa ~111 MB; el filtrado se
hace en flujo, sin extraer el archivo completo (~481 MB).
"""
import csv
import io
import sys
import zipfile

CAUSAS = ("C50", "C53")
ENT_JALISCO = "14"

COLUMNAS = [
    "CLUES",
    "INGRE",
    "EGRESO",
    "DIAS_ESTA",
    "EDAD",
    "SEXO",
    "DERHAB",
    "ENTIDAD",
    "MUNIC",
    "SERVICIOEGRE",
    "MOTEGRE",
    "DIAG_INI",
    "AFECPRIN",
]


def main():
    origen, salida = sys.argv[1], sys.argv[2]
    zf = zipfile.ZipFile(origen)
    try:
        f = zf.open("Registros/Egresos.txt")
        fh = io.TextIOWrapper(f, encoding="utf-8-sig", newline="")
        rdr = csv.DictReader(fh, delimiter="|")
        registros = []
        por_causa = {"C50": 0, "C53": 0}
        for row in rdr:
            if row["ENTIDAD"] != ENT_JALISCO:
                continue
            diag = row["AFECPRIN"] or ""
            if diag[:3] not in CAUSAS:
                continue
            registros.append(
                {
                    "cvegeo_resid": row["ENTIDAD"] + row["MUNIC"],
                    "clues": row["CLUES"],
                    "fecha_ingreso": row["INGRE"],
                    "fecha_egreso": row["EGRESO"],
                    "dias_estancia": row["DIAS_ESTA"],
                    "edad": row["EDAD"],
                    "sexo": row["SEXO"],
                    "derechohabiencia": row["DERHAB"],
                    "servicio_egreso": row["SERVICIOEGRE"],
                    "motivo_egreso": row["MOTEGRE"],
                    "diag_ingreso": row["DIAG_INI"],
                    "afec_principal": diag,
                    "causa_grupo": diag[:3],
                }
            )
            por_causa[diag[:3]] += 1

        out = f"{salida}/egresos_hospitalarios_jalisco_c50_c53_2024.csv"
        with open(out, "w", encoding="utf-8", newline="") as fo:
            w = csv.DictWriter(fo, fieldnames=list(registros[0].keys()) if registros else [])
            w.writeheader()
            w.writerows(registros)
        print(f"{out}: {len(registros)} filas (C50={por_causa['C50']}, C53={por_causa['C53']})")
    finally:
        zf.close()


if __name__ == "__main__":
    main()
