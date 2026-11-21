#!/usr/bin/env python3
"""Genera los archivos FICTICIOS de demostración (determinista).

    python datos_demo/generar.py            # escribe en py/datos_demo/archivos/

Cubre el caso de la guía de EIRA (120 atenciones y 80 participaciones con personas
repetidas entre ambos) y los casos de duplicados: copia, re-guardado, otro orden de
columnas, CSV, versión nueva, traslape parcial y mismo ID con nombres distintos.
Los encabezados son supuestos: EIRA todavía no comparte sus archivos reales.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import random
import shutil
import sys
from pathlib import Path

from openpyxl import Workbook

SALIDA = Path(__file__).resolve().parent / "archivos"
CIUDADES = ["Zapotlán el Grande", "Sayula", "Gómez Farías", "Tapalpa", "Jocotepec", "San Martín Hidalgo"]
NOMBRES = ["María", "Guadalupe", "Carmen", "Rosa", "Leticia", "Patricia", "Alicia", "Teresa", "Elena",
           "Verónica", "Lucía", "Silvia", "Yolanda", "Araceli", "Norma", "Imelda", "Adriana", "Claudia",
           "Dolores", "Esperanza", "Irma", "Josefina", "Lourdes", "Marisol", "Ofelia"]
APELLIDOS = ["López", "Torres", "Vega", "Mora", "Anaya", "Ramírez", "Gómez", "Hernández", "Díaz", "Cruz",
             "Flores", "Ortega", "Ruiz", "Medina", "Castro", "Reyes", "Salazar", "Navarro", "Ibarra", "Lara",
             "Peña", "Rojas", "Campos", "Aguilar", "Cortés"]
SERV_TAMIZAJE = ["Papanicolaou", "Ultrasonido de mama", "Exploración clínica", "Mastografía"]
ENCAB_T = ["ID EIRA", "Nombre completo", "Fecha de nacimiento", "Edad", "Municipio", "Tipo de servicio",
           "Fecha de servicio", "Asistió"]
CORTE = dt.date(2026, 9, 30)


def sin(s: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def persona(i: int, rng: random.Random) -> dict:
    nom, pat, mat = NOMBRES[i % len(NOMBRES)], APELLIDOS[(i * 7) % len(APELLIDOS)], APELLIDOS[(i * 3 + 5) % len(APELLIDOS)]
    nac = dt.date(1962 + (i * 7) % 40, 1 + (i * 5) % 12, 1 + (i * 11) % 28)
    ini = (sin(pat)[0] + sin(mat)[0] + sin(nom)[0]).upper()
    return {"i": i, "nombre": f"{nom} {pat} {mat}", "id": ini + nac.strftime("%Y%m%d"), "nac": nac,
            "ciudad": CIUDADES[i % len(CIUDADES)]}


def edad(nac: dt.date) -> int:
    return CORTE.year - nac.year - ((CORTE.month, CORTE.day) < (nac.month, nac.day))


def fila(p: dict, servicio: str, fecha: dt.date, asiste: bool = True) -> dict:
    return {"id": p["id"], "nombre": p["nombre"], "nac": p["nac"], "edad": edad(p["nac"]),
            "ciudad": p["ciudad"], "servicio": servicio, "fecha": fecha, "asiste": "Sí" if asiste else "No"}


def escribir_xlsx(ruta: Path, encabezados: list, filas: list[list], titulo: str | None = None,
                  total: bool = False, hoja: str = "Datos") -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = hoja
    if titulo:
        ws.append([titulo])
        ws.append([])
    ws.append(encabezados)
    for f in filas:
        ws.append(f)
    if total:
        ws.append(["TOTAL", None, None, None, None, None, None, f"{len(filas)}"])
    wb.save(ruta)


def escribir_csv(ruta: Path, encabezados: list, filas: list[list]) -> None:
    with open(ruta, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(encabezados)
        for r in filas:
            w.writerow([x.isoformat() if isinstance(x, dt.date) else x for x in r])


def fila_t(r: dict) -> list:  # orden de ENCAB_T
    return [r["id"], r["nombre"], r["nac"], r["edad"], r["ciudad"], r["servicio"], r["fecha"], r["asiste"]]


def generar() -> dict:
    rng = random.Random(2026)
    SALIDA.mkdir(parents=True, exist_ok=True)
    P = [persona(i, rng) for i in range(150)]
    assert len({p["id"] for p in P}) == 150, "IDs ficticios repetidos"

    def fecha_rnd() -> dt.date:
        return dt.date(2026, 2, 1) + dt.timedelta(days=rng.randrange(0, 230))

    # --- Tamizaje Rosa: 120 atenciones, personas 0..89 ---
    base = [fila(P[r % 90], SERV_TAMIZAJE[r % 4], fecha_rnd()) for r in range(120)]
    # Problemas sembrados (índices fijos, fuera de las filas que luego comparte nutricion: 40..69)
    base[3]["asiste"] = base[8]["asiste"] = base[15]["asiste"] = "No"          # 3 inasistencias
    base[20]["fecha"] = None                                                  # fecha vacía
    base[21]["fecha"] = dt.date(2026, 12, 15)                                 # posterior al corte
    base[22]["ciudad"] = "Rancho El Mezquite"                       # municipio desconocido
    base[23]["ciudad"] = "Sayulla"                                            # variante de escritura
    base[24]["id"] = "XX-0000"                                                # ID inválido
    base[25]["id"] = None                                                     # sin ID (queda sin persona)
    base[26]["id"] = None
    base[27]["edad"] = 18 if base[27]["edad"] > 30 else 80                    # edad inconsistente
    # Mismo ID con nombres distintos (para el flujo de decisión humana):
    P0, P1 = P[0], P[1]
    base[0] = fila(P0, "Papanicolaou", dt.date(2026, 3, 10))
    base[1] = fila(P1, "Mastografía", dt.date(2026, 3, 11))
    tamizaje = base + [dict(base[5]), dict(base[6])]                          # 2 filas repetidas
    total_ids_t = {r["id"] for r in tamizaje if r["id"] and r["id"] != "XX-0000"}
    escribir_xlsx(SALIDA / "tamizaje-rosa.xlsx", ENCAB_T, [fila_t(r) for r in tamizaje],
                  titulo="Tamizaje Rosa — reporte de jornadas (FICTICIO)", total=True)

    # Copia idéntica, re-guardado, otro orden de columnas, CSV
    shutil.copyfile(SALIDA / "tamizaje-rosa.xlsx", SALIDA / "tamizaje-rosa-copia.xlsx")
    escribir_xlsx(SALIDA / "tamizaje-rosa-reguardado.xlsx", ENCAB_T, [fila_t(r) for r in tamizaje], hoja="Reporte")
    orden = [4, 0, 6, 1, 5, 7, 2, 3]
    escribir_xlsx(SALIDA / "tamizaje-rosa-otro-orden.xlsx", [ENCAB_T[i] for i in orden],
                  [[fila_t(r)[i] for i in orden] for r in reversed(tamizaje)])
    escribir_csv(SALIDA / "tamizaje-rosa.csv", ENCAB_T, [fila_t(r) for r in tamizaje])
    # Versión nueva: lo mismo + 8 filas
    nuevas8 = [fila(P[90 + k], "Papanicolaou", dt.date(2026, 9, 1 + k)) for k in range(8)]
    escribir_xlsx(SALIDA / "tamizaje-rosa-v2.xlsx", ENCAB_T, [fila_t(r) for r in tamizaje + nuevas8])

    # --- Salud que Florece: 80 participaciones, personas 75..149 (cruce 75..89) ---
    salud = []
    for r in range(80):
        p = P[75 + (r % 75)]
        salud.append(fila(p, "Taller de salud", fecha_rnd(), asiste=(r % 20 != 7)))
    # Los mismos ID de P0 y P1 aparecen con nombre distinto / variante
    salud[10] = fila({**P0, "nombre": "María Elena Landa Mora"}, "Taller de salud", dt.date(2026, 4, 2))
    salud[11] = fila({**P1, "nombre": P1["nombre"][:-1] + "o"}, "Taller de salud", dt.date(2026, 4, 9))  # variante
    enc_s = ["Participante", "Clave", "Municipio", "Taller", "Fecha", "Asistencia (Sí/No)", "Fecha de nac."]
    filas_s = []
    for k, r in enumerate(salud):
        fecha = r["fecha"].strftime("%d/%m/%Y") if k % 3 == 0 else r["fecha"]   # fechas de dos tipos
        filas_s.append([r["nombre"], r["id"], r["ciudad"], r["servicio"], fecha, r["asiste"], r["nac"]])
    escribir_xlsx(SALIDA / "salud-que-florece.xlsx", enc_s, filas_s)

    # --- Nutrición: 40 nuevas + 30 filas que ya estaban en tamizaje ---
    comparte = [dict(r) for r in tamizaje[40:70]]
    nuevas40 = [fila(P[90 + k], "Nutrióloga", fecha_rnd()) for k in range(40)]
    enc_n = ["Nombre", "ID", "Municipio", "Servicio", "Fecha", "Asistencia"]
    escribir_xlsx(SALIDA / "nutricion.xlsx", enc_n,
                  [[r["nombre"], r["id"], r["ciudad"], r["servicio"], r["fecha"], r["asiste"]] for r in comparte + nuevas40])

    esperado = {
        "tamizaje_filas": len(tamizaje), "salud_filas": len(salud), "nutricion_filas": 70,
        "personas_tamizaje": len(total_ids_t),
        "personas_salud": len({r["id"] for r in salud if r["asiste"] == "Sí"}),
        "cruce_tamizaje_salud": len(total_ids_t & {r["id"] for r in salud if r["asiste"] == "Sí"}),
    }
    (SALIDA / "esperado.json").write_text(json.dumps(esperado, indent=2, ensure_ascii=False), encoding="utf-8")
    return esperado


if __name__ == "__main__":
    print(json.dumps(generar(), indent=2, ensure_ascii=False))
    print("Archivos en", SALIDA, file=sys.stderr)
