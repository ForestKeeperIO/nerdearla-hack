#!/usr/bin/env python3
"""Crea la base SQLite de demostración con el esquema REAL del motor
(db/esquema.sql, rama `motor`) y datos ficticios.

Uso:
    uv run metabase/datos_prueba.py [--db RUTA] [--vacia]

`--vacia` crea el esquema y los catálogos, sin registros (los tableros deben
mostrar "sin resultados"). La ruta por defecto es $IMPACTO_DB o
data/impacto.sqlite.

Programas del demo: tamizaje-rosa (atenciones y estudios, rol beneficiaria) y
melenas-en-movimiento (donaciones de trenza — rol donante, NO cuentan como
personas impactadas — y pelucas entregadas, rol beneficiaria). Nunca escribe
nombres completos ni el ID de EIRA: personas.id y las etiquetas son opacas.
"""
import argparse
import hashlib
import json
import os
import random
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from db import catalogo  # noqa: E402  (lectores de catalogos del motor)

ESQUEMA = RAIZ / "db" / "esquema.sql"
INICIATIVAS_JSON = RAIZ / "catalogos" / "iniciativas.json"

# Municipios de Jalisco donde hay actividad (claves INEGI reales del catálogo)
MUNICIPIOS_JAL = [
    "14039",  # Guadalajara
    "14120",  # Zapopan
    "14098",  # San Pedro Tlaquepaque
    "14101",  # Tonalá
    "14097",  # Tlajomulco de Zúñiga
    "14067",  # Puerto Vallarta
    "14023",  # Zapotlán el Grande
    "14053",  # Lagos de Moreno
]
# Donantes de Melenas también llegan de la Ciudad de México
MUNICIPIOS_CDMX = ["09002", "09007", "09010"]  # Azcapotzalco, Iztapalapa, Álvaro Obregón

SERVICIOS_TAMIZAJE = ["Papanicolaou", "ultrasonido de mama", "exploración clínica", "valoración nutricional"]


def pid(semilla: str) -> str:
    return "p" + hashlib.sha256(semilla.encode()).hexdigest()[:15]


def cargar_catalogos(db: sqlite3.Connection) -> None:
    """Inserta los catálogos compartidos (iniciativas, tipos, roles, municipios)."""
    ini_json = json.loads(INICIATIVAS_JSON.read_text(encoding="utf-8"))
    for t in ini_json["tipos_de_registro"]:
        db.execute(
            "INSERT OR REPLACE INTO tipos_de_registro VALUES (?,?,?,?,?)",
            (t["clave"], t["etiqueta"], t["plural"], t["se_cuenta"],
             1 if t["cuenta_personas"] else 0))
    for r in ini_json["roles_de_persona"]:
        db.execute(
            "INSERT OR REPLACE INTO roles_de_persona VALUES (?,?,?)",
            (r["clave"], r["etiqueta"], 1 if r["cuenta_como_impactada"] else 0))
    for ini in ini_json["iniciativas"]:
        db.execute(
            "INSERT OR REPLACE INTO iniciativas VALUES (?,?,?,?,?,?,?)",
            (ini["id"], ini["nombre"], ini["clase"], ini["descripcion"],
             ini.get("rol_por_defecto"), ini["estado"],
             1 if ini.get("en_demo") else 0))
        for tipo in ini["tipos_de_registro"]:
            db.execute(
                "INSERT OR REPLACE INTO iniciativa_tipo VALUES (?,?,?)",
                (ini["id"], tipo, catalogo.rol_de(ini, tipo)))
    for m in catalogo.municipios():
        db.execute(
            "INSERT OR REPLACE INTO municipios VALUES (?,?,?,?)",
            (m["clave"], m["municipio"], m["estado_clave"], m["estado"]))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.environ.get("IMPACTO_DB", str(RAIZ / "data" / "impacto.sqlite")))
    ap.add_argument("--vacia", action="store_true", help="solo esquema y catálogos, sin registros")
    args = ap.parse_args()

    ruta = Path(args.db)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if ruta.exists():
        ruta.unlink()
    db = sqlite3.connect(ruta)
    db.executescript(ESQUEMA.read_text(encoding="utf-8"))
    cargar_catalogos(db)
    if args.vacia:
        db.commit()
        print(f"Base vacía (esquema + catálogos) creada en {ruta}")
        return

    rng = random.Random(20261121)
    ahora = "2026-11-21T12:00:00"
    corte = "2026-10-31"
    por_clave = catalogo.municipio_por_clave()

    def mun(clave: str) -> dict:
        return por_clave[clave]

    # 95 personas ficticias con identificador opaco
    personas = []
    for i in range(95):
        nac = f"{rng.randint(1958, 2001)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"
        clave = MUNICIPIOS_JAL[rng.randrange(len(MUNICIPIOS_JAL))]
        personas.append({"id": pid(f"persona-{i}"), "nac": nac, "mun": clave})
    db.executemany(
        "INSERT INTO personas VALUES (?,?,?,?)",
        [(p["id"], "id", p["nac"], mun(p["mun"])["municipio"]) for p in personas])
    # Identidades: etiqueta de iniciales ficticias (nunca nombre completo)
    iniciales = ["MG", "LR", "AC", "JT", "SP", "EV", "NB", "CH", "DF", "GQ"]
    for i, p in enumerate(personas):
        etiqueta = f"{iniciales[i % len(iniciales)]} · {mun(p['mun'])['municipio']}"
        db.execute(
            "INSERT INTO identidades VALUES (?,?,?,?,?,?,?)",
            (pid(f"clave-{i}"), pid(f"nombre-{i}"), p["id"], etiqueta,
             "demo", i + 1, p["nac"][:4]))

    fuentes = [
        # (id, nombre, iniciativa, tipo_registro del trabajo, filas, nuevas, omitidas, inasistencias, estrellas, puntaje)
        (pid("f-tamizaje"), "tamizaje-rosa.xlsx", "tamizaje-rosa", "atencion",
         126, 120, 6, 5, 5, 96.5),
        (pid("f-melenas-don"), "melenas-donaciones.xlsx", "melenas-en-movimiento", "segun_fila",
         88, 84, 4, 0, 4, 88.0),
        (pid("f-melenas-ent"), "melenas-entregas.xlsx", "melenas-en-movimiento", "producto_entregado",
         34, 34, 0, 0, 5, 97.0),
    ]
    db.executemany(
        "INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [(fid, nombre, ini, tipo, corte, ahora, "demo",
          filas, nuevas, omitidas, inas, estrellas, puntaje,
          hashlib.sha256(nombre.encode()).hexdigest())
         for fid, nombre, ini, tipo, filas, nuevas, omitidas, inas, estrellas, puntaje in fuentes])

    registros = []

    def reg(fid, fila, persona, ini, tipo, rol, servicio, fecha, clave_mun,
            cantidad=1.0, contado=1):
        m = mun(clave_mun) if clave_mun else {}
        registros.append((
            pid(f"reg-{fid}-{fila}"), fid, fila, persona, ini, tipo, rol,
            servicio, fecha, fecha[:7] if fecha else "2026",
            m.get("municipio") if m else None,
            m.get("estado_clave"), m.get("estado"),
            m.get("clave"), m.get("municipio"),
            cantidad,
            hashlib.sha256(f"{fid}:{fila}".encode()).hexdigest(), contado))

    # Tamizaje Rosa: 88 atenciones + 32 estudios sobre 60 beneficiarias.
    fid = pid("f-tamizaje")
    fila = 0
    for n in range(120):
        i_per = n % 60
        fila += 1
        reg(fid, fila, personas[i_per]["id"], "tamizaje-rosa",
            "atencion" if n < 88 else "estudio", "beneficiaria",
            SERVICIOS_TAMIZAJE[n % len(SERVICIOS_TAMIZAJE)],
            f"2026-{rng.randint(3, 10):02d}-{rng.randint(1, 28):02d}",
            personas[i_per]["mun"])
    for n in range(6):  # filas omitidas por repetidas
        fila += 1
        reg(fid, fila, None, "tamizaje-rosa", "atencion", "beneficiaria",
            None, None, None, contado=0)

    # Melenas: 84 donaciones de trenza (58 donantes; algunas también en CDMX)
    fid = pid("f-melenas-don")
    for n in range(84):
        i_per = 60 + (n % 30)  # donantes: personas 60-89
        fila = n + 1
        clave = (MUNICIPIOS_CDMX + MUNICIPIOS_JAL)[n % (len(MUNICIPIOS_CDMX) + len(MUNICIPIOS_JAL))]
        reg(fid, fila, personas[i_per]["id"], "melenas-en-movimiento",
            "donacion", "donante", "donación de trenza",
            f"2026-{rng.randint(1, 10):02d}-{rng.randint(1, 28):02d}",
            clave, cantidad=1.0)
    for n in range(4):
        reg(fid, 85 + n, None, "melenas-en-movimiento", "donacion", "donante",
            None, None, None, contado=0)

    # Melenas: 34 pelucas entregadas; 12 receptoras ya fueron atendidas en
    # Tamizaje Rosa (personas_en_mas_de_un_programa), el resto son nuevas.
    fid = pid("f-melenas-ent")
    for n in range(34):
        i_per = n if n < 12 else 90 + ((n - 12) % 5)
        reg(fid, n + 1, personas[i_per]["id"], "melenas-en-movimiento",
            "producto_entregado", "beneficiaria", "peluca oncológica",
            f"2026-{rng.randint(4, 10):02d}-{rng.randint(1, 28):02d}",
            personas[i_per]["mun"])

    db.executemany(
        "INSERT INTO registros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        registros)

    anomalias = []
    reglas = [("sin_id", 8, pid("f-tamizaje")), ("fecha_invalida", 3, pid("f-tamizaje")),
              ("ciudad_desconocida", 2, pid("f-tamizaje")), ("id_invalido", 4, pid("f-melenas-don"))]
    for regla, cuenta, fid in reglas:
        for j in range(cuenta):
            anomalias.append((None, fid, j + 1, regla, "fecha", f"{regla} en fila {j + 1}"))
    db.executemany(
        "INSERT INTO anomalias (id,fuente_id,fila,regla,campo,detalle) VALUES (?,?,?,?,?,?)",
        anomalias)

    pares = [
        (pid("par-1"), personas[0]["id"], personas[30]["id"], 0.87, "Mismo ID, nombres distintos", "pendiente"),
        (pid("par-2"), personas[3]["id"], personas[61]["id"], 0.62, "Nombre y fecha parecidos", "pendiente"),
    ]
    db.executemany(
        "INSERT INTO pares_persona (id,persona_a,persona_b,probabilidad,motivo,estado) VALUES (?,?,?,?,?,?)",
        pares)
    db.execute(
        "INSERT INTO bitacora (en,por,tipo,detalle) VALUES (?,?,?,?)",
        (ahora, "demo", "carga", "Datos ficticios de la Tarea 4"))
    db.commit()
    print(f"Base ficticia en {ruta}: {len(fuentes)} fuentes, {len(personas)} personas, "
          f"{sum(1 for r in registros if r[-1] == 1)} registros contados")


if __name__ == "__main__":
    main()
