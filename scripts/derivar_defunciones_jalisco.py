#!/usr/bin/env python3
"""Deriva los reportes de defunciones por cancer de mama (C50) y cervicouterino
(C53) de mujeres residentes en Jalisco, a partir de los microdatos de
Estadisticas de Defunciones Registradas (EDR) 2024 de INEGI.

Uso:
    python3 scripts/derivar_defunciones_jalisco.py <ruta a conjunto_de_datos_edr2024_csv.zip o al csv extraido> <dir salida>

Solo usa la biblioteca estandar. El zip oficial pesa ~31 MB.
"""
import csv
import io
import sys
import zipfile

CAUSAS = ("C50", "C53")
ENT_JALISCO = "14"
SEXO_MUJER = "2"


def abrir_csv(ruta):
    """Devuelve un lector de texto sobre el CSV dentro del zip o suelto."""
    if ruta.endswith(".zip"):
        zf = zipfile.ZipFile(ruta)
        nombre = next(
            n for n in zf.namelist() if n.startswith("conjunto_de_datos/") and n.endswith(".csv")
        )
        f = zf.open(nombre)
        return zf, io.TextIOWrapper(f, encoding="utf-8-sig", newline="")
    return None, open(ruta, encoding="utf-8-sig", newline="")


def edad_anios(edad_cod):
    """Decodifica el campo EDAD de EDR: 4xxx = anios cumplidos."""
    try:
        e = int(edad_cod)
    except (TypeError, ValueError):
        return ""
    if 4001 <= e <= 4997:
        return str(e - 4000)
    if 1001 <= e < 4000:  # horas/dias/meses: menor de 1 anio
        return "0"
    return ""  # 4998/9998 y otros = no especificado


def grupo_edad(anios):
    if anios == "":
        return "no especificado"
    a = int(anios)
    for lo, hi in ((0, 19), (20, 29), (30, 39), (40, 49), (50, 59), (60, 69), (70, 79), (80, 200)):
        if lo <= a <= hi:
            return f"{lo}-{hi if hi < 200 else '+'}"
    return "no especificado"


def main():
    origen, salida = sys.argv[1], sys.argv[2]
    zf, fh = abrir_csv(origen)
    try:
        rdr = csv.DictReader(fh)
        registros = []
        mensual = {}
        for row in rdr:
            causa = row["causa_def"]
            if (
                row["ent_resid"] == ENT_JALISCO
                and row["sexo"] == SEXO_MUJER
                and causa[:3] in CAUSAS
            ):
                anios = edad_anios(row["edad"])
                cvegeo = row["ent_resid"] + row["mun_resid"]
                registros.append(
                    {
                        "cvegeo_resid": cvegeo,
                        "causa_grupo": causa[:3],
                        "causa_cie10": causa,
                        "edad_anios": anios,
                        "grupo_edad": grupo_edad(anios),
                        "escolarida": row["escolarida"],
                        "edo_civil": row["edo_civil"],
                        "derechohab": row["derechohab"],
                        "lugar_ocur": row["lugar_ocur"],
                        "asist_medi": row["asist_medi"],
                        "anio_ocur": row["anio_ocur"],
                        "mes_ocurr": row["mes_ocurr"],
                        "anio_regis": row["anio_regis"],
                        "mes_regis": row["mes_regis"],
                    }
                )
                mes = row["mes_ocurr"].zfill(2) if row["mes_ocurr"].isdigit() else "99"
                k = (causa[:3], mes)
                mensual[k] = mensual.get(k, 0) + 1

        out1 = f"{salida}/defunciones_mujeres_jalisco_c50_c53_2024.csv"
        cols = list(registros[0].keys()) if registros else []
        with open(out1, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(registros)

        out2 = f"{salida}/defunciones_jalisco_mujeres_c50_c53_mensual_2024.csv"
        with open(out2, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["anio", "mes_ocur", "causa_grupo", "defunciones_mujeres"])
            for (causa, mes), n in sorted(mensual.items()):
                w.writerow([2024, mes, causa, n])

        c50 = sum(1 for r in registros if r["causa_grupo"] == "C50")
        c53 = sum(1 for r in registros if r["causa_grupo"] == "C53")
        print(f"{out1}: {len(registros)} filas (C50={c50}, C53={c53})")
        print(f"{out2}: {len(mensual)} filas")
    finally:
        fh.close()
        if zf:
            zf.close()


if __name__ == "__main__":
    main()
