#!/usr/bin/env python3
"""Crea una base SQLite TEMPORAL con el esquema de la Tarea 1 del plan y datos
ficticios, para provisionar Metabase sin esperar a la rama `db`.

Uso:
    uv run metabase/datos_prueba.py [--db RUTA] [--vacia]

`--vacia` crea solo el esquema (tableros deben mostrar "sin resultados").
La ruta por defecto es $IMPACTO_DB o data/impacto.sqlite.
Nunca escribe nombres completos ni el ID de EIRA: personas.id es opaco.
"""
import argparse
import hashlib
import os
import random
import sqlite3
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ESQUEMA = Path(__file__).resolve().parent / "esquema_prueba.sql"

# Municipios de Jalisco (claves INEGI reales; denominadores FICTICIOS)
MUNICIPIOS = [
    ("14039", "Guadalajara", 52100),
    ("14120", "Zapopan", 47800),
    ("14098", "San Pedro Tlaquepaque", 22500),
    ("14101", "Tonalá", 18900),
    ("14097", "Tlajomulco de Zúñiga", 24100),
    ("14067", "Puerto Vallarta", 9800),
]

PROGRAMAS = [
    ("Tamizaje Rosa", "atencion", "tamizaje-rosa.xlsx"),
    ("Salud que Florece", "participacion", "salud-que-florece.xlsx"),
    ("Nutrición", "atencion", "nutricion.xlsx"),
]

SERVICIOS = ["mastografía", "valoración clínica", "ultrasonido", "taller", "consulta"]


def pid(semilla: str) -> str:
    return "p" + hashlib.sha256(semilla.encode()).hexdigest()[:15]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.environ.get("IMPACTO_DB", str(RAIZ / "data" / "impacto.sqlite")))
    ap.add_argument("--vacia", action="store_true", help="solo esquema, sin datos")
    args = ap.parse_args()

    ruta = Path(args.db)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if ruta.exists():
        ruta.unlink()
    db = sqlite3.connect(ruta)
    db.executescript(ESQUEMA.read_text())
    if args.vacia:
        db.commit()
        print(f"Base vacía creada en {ruta}")
        return

    rng = random.Random(20261121)
    ahora = "2026-11-21T12:00:00"
    corte = "2026-10-31"

    for clave, nombre, mujeres in MUNICIPIOS:
        db.execute(
            "INSERT INTO denominadores VALUES (?,?,?,?,?)",
            (clave, nombre, mujeres, "ficticio (Tarea 4)", 2026),
        )

    # 60 personas ficticias con identificador opaco
    personas = []
    for i in range(60):
        nac = f"{rng.randint(1961, 2000)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"
        ciudad = MUNICIPIOS[rng.randrange(len(MUNICIPIOS))][1]
        personas.append((pid(f"persona-{i}"), "id", nac, ciudad))
    db.executemany("INSERT INTO personas VALUES (?,?,?,?)", personas)

    fuentes = []
    registros = []
    anomalias = []
    n_reg = 0
    for f_idx, (programa, unidad, nombre) in enumerate(PROGRAMAS):
        fid = pid(f"fuente-{programa}")
        n_filas = [120, 80, 40][f_idx]
        omitidas = [4, 0, 30][f_idx]
        fuentes.append(
            (
                fid, nombre, programa, unidad, corte, ahora, "demo",
                n_filas + omitidas, n_filas, omitidas, [6, 4, 0][f_idx],
                [5, 4, 3][f_idx], [96.5, 88.0, 71.0][f_idx],
                hashlib.sha256(nombre.encode()).hexdigest(),
                hashlib.sha256((nombre + "-contenido").encode()).hexdigest(),
            )
        )
        # personas del programa: las primeras 15 se repiten entre los dos primeros
        if f_idx == 0:
            pool = list(range(50))
        elif f_idx == 1:
            pool = list(range(15)) + list(range(50, 60)) + list(range(20, 40))
        else:
            pool = list(range(10, 50))
        for fila in range(1, n_filas + 1):
            i_per = pool[fila % len(pool)]
            clave, ciudad, _ = MUNICIPIOS[i_per % len(MUNICIPIOS)]
            registros.append(
                (
                    pid(f"reg-{fid}-{fila}"), fid, fila, personas[i_per][0],
                    programa, unidad, SERVICIOS[fila % len(SERVICIOS)],
                    f"2026-{rng.randint(1, 10):02d}-{rng.randint(1, 28):02d}",
                    "2026", ciudad, clave, 1.0,
                    hashlib.sha256(f"{fid}:{fila}".encode()).hexdigest(), 1,
                )
            )
            n_reg += 1
        # filas omitidas (contado = 0) para el tablero de calidad
        for fila in range(n_filas + 1, n_filas + omitidas + 1):
            registros.append(
                (
                    pid(f"reg-{fid}-{fila}"), fid, fila, None,
                    programa, unidad, None, None, "2026", None, None, 1.0,
                    hashlib.sha256(f"{fid}:{fila}".encode()).hexdigest(), 0,
                )
            )
        for regla, cuenta in [("fecha_invalida", 3), ("ciudad_desconocida", 2), ("id_invalido", 3), ("sin_id", 8)]:
            for j in range(cuenta):
                anomalias.append((None, fid, j + 1, regla, "fecha", f"{regla} en {nombre}"))

    db.executemany("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", fuentes)
    db.executemany("INSERT INTO registros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", registros)
    db.executemany("INSERT INTO anomalias (id,fuente_id,fila,regla,campo,detalle) VALUES (?,?,?,?,?,?)", anomalias)

    pares = [
        (pid("par-1"), personas[0][0], personas[25][0], 0.87, "Mismo ID, nombres distintos", "pendiente"),
        (pid("par-2"), personas[3][0], personas[44][0], 0.62, "Nombre y fecha parecidos", "pendiente"),
    ]
    db.executemany("INSERT INTO pares_persona (id,persona_a,persona_b,probabilidad,motivo,estado) VALUES (?,?,?,?,?,?)", pares)
    db.execute("INSERT INTO bitacora (en,por,tipo,detalle) VALUES (?,?,?,?)", (ahora, "demo", "carga", "Datos ficticios de la Tarea 4"))
    db.commit()
    print(f"Base ficticia en {ruta}: {len(fuentes)} fuentes, {len(personas)} personas, {n_reg} registros contados")


if __name__ == "__main__":
    main()
