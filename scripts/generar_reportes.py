"""Genera los reportes de prueba ficticios de EIRA (Tarea 2 del plan).

Determinista: no usa azar; todo se deriva del indice de la persona.
Escribe en reportes/ los siete archivos y esperado.json, calculado al
construir los datos (no al leerlos).

Uso: uv run python scripts/generar_reportes.py [directorio]
"""
import hashlib
import json
import shutil
import sys
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook

# --- Catalogos ----------------------------------------------------------------

CIUDADES = [
    ("Zapotlán el Grande", "14023"), ("Sayula", "14082"), ("Gómez Farías", "14079"),
    ("Tapalpa", "14086"), ("Jocotepec", "14050"), ("San Martín Hidalgo", "14077"),
]

SERVICIOS_TAMIZAJE = ["Papanicolaou", "Ultrasonido de mama", "Exploración clínica"]
SERVICIO_NUTRICION = "Valoración nutricional"
TIPO_DONACION = "Donación de trenza"
TIPO_PELUCA = "Entrega de peluca"

NOMBRES = ["María", "Ana", "Juana", "Rosa", "Leticia", "Carmen", "Silvia", "Paola",
           "Teresa", "Elena", "Beatriz", "Dolores", "Gloria", "Hilda", "Irene",
           "Josefina", "Karla", "Laura", "Nadia", "Ofelia", "Patricia", "Queta",
           "Ramona", "Sofía", "Úrsula", "Valeria", "Wendy", "Ximena", "Yolanda", "Zoe"]
SEGUNDOS = ["Elena", "Isabel", "Luz", "Mar", "Alicia", "Guadalupe", "Inés", "Julia",
            "Fernanda", "Gabriela", "Victoria", "Alejandra", "Daniela", "Esther",
            "Olga", "Margarita", "Noemí", "Andrea", "Cecilia", "Renata", "Monserrat",
            "Liliana", "Emilia", "Aurora", "Camila", "Regina", "Tania", "Dalia",
            "Bianca", "Selene"]
APELLIDOS = ["López", "Torres", "Vega", "Mora", "Anaya", "García", "Hernández",
             "Martínez", "Ramírez", "Flores", "Rivera", "Gómez", "Díaz", "Cruz",
             "Reyes", "Morales", "Ortiz", "Gutiérrez", "Chávez", "Ruiz", "Mendoza",
             "Aguilar", "Castillo", "Romero", "Álvarez", "Vargas", "Soto", "Rojas",
             "Navarro", "Paredes", "Campos"]

HOY = date(2026, 11, 21)


def nombre_unico(i: int) -> str:
    """Nombre ficticio unico y determinista para la persona i."""
    return f"{NOMBRES[i % 30]} {SEGUNDOS[(i // 30) % 30]} {APELLIDOS[i % 30]}"


def nacimiento(i: int) -> date:
    return date(1961 + (i * 7) % 40, 1 + (i * 5) % 12, 1 + (i * 11) % 28)


def id_eira(nombre: str, nac: date) -> str:
    """ID de EIRA: una inicial por cada una de las tres primeras partes del
    nombre mas la fecha de nacimiento AAAAMMDD."""
    ini = "".join(p[0] for p in nombre.split()[:3]).upper()
    return ini + nac.strftime("%Y%m%d")


def edad_en(nac: date, en: date) -> int:
    return (en - nac).days // 365


class Persona:
    def __init__(self, nombre: str, nac: date, ciudad: str, con_id: bool = True,
                 id_forzado: str | None = None):
        self.nombre = nombre
        self.nac = nac
        self.ciudad = ciudad
        self.id = (id_forzado or id_eira(nombre, nac)) if con_id else ""


def fecha(i: int) -> date:
    """Fecha de servicio entre feb y sep de 2026."""
    return date(2026, 2, 1) + timedelta(days=(i * 13) % 240)


# --- Construccion del dataset --------------------------------------------------

def construir():
    """Devuelve (filas_por_archivo, esperado). Cada fila es un dict de celdas
    ya normalizadas al formato del archivo."""
    personas: dict[str, Persona] = {}

    def per(clave: str, con_id=True, nombre=None, nac=None, ciudad=None, id_forzado=None):
        if clave not in personas:
            personas[clave] = Persona(nombre or nombre_unico(len(personas)),
                                      nac or nacimiento(len(personas)),
                                      ciudad or CIUDADES[len(personas) % 6][0],
                                      con_id, id_forzado)
        return personas[clave]

    tamizaje, melenas, nutricion, v2_extra = [], [], [], []
    esperado_arch = {}

    # --- tamizaje-rosa.xlsx -----------------------------------------------------
    # Filas 0-29: limpias, se comparten con nutricion (T0..T29).
    # T0..T14 tambien aparecen en salud (cruce de 15).
    for i in range(30):
        p = per(f"T{i}")
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[i % 3], fecha=fecha(i), asistio="Sí"))
    # Filas 30-84: T30..T84.
    for i in range(30, 85):
        p = per(f"T{i}")
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[i % 3], fecha=fecha(i), asistio="Sí"))
    # Filas 85-89: personas especiales (colisiones y variantes, parte en este archivo).
    esp = [
        ("D1a", "María Elena López", date(1984, 3, 12)),
        ("D2a", "Ana María Sosa", date(1971, 7, 25)),
        ("V1a", "Carmen Alicia Vega", date(1988, 5, 4)),
        ("V2a", "Rosa Isela Mora", date(1965, 9, 19)),
        ("V3a", "Leticia Anaya Ruiz", date(1979, 1, 30)),
    ]
    ids_especiales = {}
    for clave, nombre, nac in esp:
        p = per(clave, nombre=nombre, nac=nac)
        ids_especiales[clave] = p.id
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[len(tamizaje) % 3],
                             fecha=fecha(len(tamizaje)), asistio="Sí"))
    # Filas 90-111: segundas visitas de T30..T51.
    for i in range(22):
        p = personas[f"T{30 + i}"]
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[(i + 1) % 3],
                             fecha=fecha(i) + timedelta(days=40), asistio="Sí"))
    # Filas 112-119: 8 sin ID (tienen nombre -> persona por folio).
    for i in range(8):
        p = per(f"F1_{i}", con_id=False)
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[i % 3], fecha=fecha(i + 60), asistio="Sí"))
    # Filas 120-125: 6 inasistencias de personas ya registradas.
    for i in range(6):
        p = personas[f"T{60 + i}"]
        tamizaje.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[i % 3],
                             fecha=fecha(i + 90), asistio="No"))
    # Filas 126-129: 4 repetidas exactas de las filas 0-3.
    for i in range(4):
        tamizaje.append(dict(tamizaje[i]))

    # Anomalias sembradas en tamizaje (en filas 33-55, fuera del tramo compartido).
    tamizaje[33]["fecha"] = "32/13/2026"   # fecha_invalida
    tamizaje[41]["fecha"] = "ayer"          # fecha_invalida
    tamizaje[47]["fecha"] = "2026-02-30"    # fecha_invalida
    tamizaje[51]["ciudad"] = "Villa Inventada"   # ciudad_desconocida
    tamizaje[52]["ciudad"] = "San Ficticio"      # ciudad_desconocida
    tamizaje[53]["id_malo"] = "XXX"              # id_invalido
    tamizaje[54]["id_malo"] = "ABC123"           # id_invalido
    tamizaje[55]["id_malo"] = "ZZZ19921340"      # id_invalido

    # --- melenas-en-movimiento.xlsx ---------------------------------------------
    # 80 filas: 60 donaciones de trenza (rol donante) y 20 entregas de peluca
    # (rol beneficiaria). 15 personas compartidas con tamizaje, 12 sin ID,
    # 2 fechas futuras, 2 colisiones y 3 variantes (entre las entregas).
    def don(p, i):
        return dict(p=p, tipo=TIPO_DONACION, largo=25 + (i % 15),
                    fecha=fecha(i + 100), asistio="Sí")

    def peluca(p, i):
        return dict(p=p, tipo=TIPO_PELUCA, largo=None,
                    fecha=fecha(i + 150), asistio="Sí")

    for i in range(15):  # T0..T14 donaron cabello (cruce de 15)
        melenas.append(don(personas[f"T{i}"], i))
    for i in range(37):
        melenas.append(don(per(f"M{i}"), 15 + i))
    for i in range(8):
        melenas.append(don(per(f"F3_{i}", con_id=False), 52 + i))
    colisiones = [
        ("D1b", "Mónica Esther Luna", date(1984, 3, 12), "D1a"),
        ("D2b", "Alberta María Sánchez", date(1971, 7, 25), "D2a"),
    ]
    for clave, nombre, nac, otro in colisiones:
        p = per(clave, nombre=nombre, nac=nac, id_forzado=ids_especiales[otro])
        melenas.append(peluca(p, len(melenas)))
    variantes = [
        ("V1b", "Carmen Alisia Vega", "V1a"),
        ("V2b", "Rosa Izela Mora", "V2a"),
        ("V3b", "Leticia Anaia Ruiz", "V3a"),
    ]
    for clave, nombre, otro in variantes:
        p_orig = personas[otro]
        p = per(clave, nombre=nombre, nac=p_orig.nac, id_forzado=p_orig.id)
        melenas.append(peluca(p, len(melenas)))
    for i in range(11):
        melenas.append(peluca(per(f"E{i}"), 65 + i))
    for i in range(4):
        melenas.append(peluca(per(f"F4_{i}", con_id=False), 76 + i))
    # Algunas donantes escriben su ciudad con alias (Ciudad Guzman / Cd. Guzman
    # -> Zapotlan el Grande, 14023).
    melenas[16]["ciudad"] = "Ciudad Guzmán"
    melenas[20]["ciudad"] = "Cd. Guzmán"
    # 2 fechas futuras (despues del corte 2026-09-30).
    melenas[61]["fecha"] = date(2026, 12, 5)
    melenas[70]["fecha"] = date(2027, 1, 15)

    # --- nutricion.xlsx ---------------------------------------------------------
    for i in range(30):
        nutricion.append(dict(tamizaje[i]))  # filas identicas a tamizaje
    for i in range(10):
        p = per(f"N{i}")
        nutricion.append(dict(p=p, servicio=SERVICIO_NUTRICION, fecha=fecha(i + 200), asistio="Sí"))

    # --- tamizaje-rosa_v2.xlsx ---------------------------------------------------
    for i in range(8):
        p = per(f"W{i}")
        v2_extra.append(dict(p=p, servicio=SERVICIOS_TAMIZAJE[i % 3], fecha=fecha(i + 220), asistio="Sí"))

    # --- Esperado (calculado al construir, no al leer) ---------------------------
    def conteos(filas):
        def llave(f):
            return (f["p"].id, f["p"].nombre, f.get("servicio") or f.get("tipo"),
                    f.get("ciudad", f["p"].ciudad),
                    str(f["fecha"]), f["asistio"], f.get("id_malo", ""))
        vistas, repetidas = set(), 0
        for f in filas:
            if llave(f) in vistas:
                repetidas += 1
            vistas.add(llave(f))
        return dict(
            filas=len(filas),
            asistencias=sum(1 for f in filas if f["asistio"] == "Sí") - repetidas,
            inasistencias=sum(1 for f in filas if f["asistio"] == "No"),
            sin_id=sum(1 for f in filas if not f["p"].id and "id_malo" not in f),
            repetidas_dentro=repetidas,
            anomalias=0,
        )

    esperado_arch["tamizaje-rosa.xlsx"] = conteos(tamizaje)
    esperado_arch["tamizaje-rosa.xlsx"].update(anomalias=20)
    esperado_arch["melenas-en-movimiento.xlsx"] = conteos(melenas)
    esperado_arch["melenas-en-movimiento.xlsx"].update(
        anomalias=14, fechas_futuras=2,
        donaciones=sum(1 for f in melenas if f["tipo"] == TIPO_DONACION),
        entregas=sum(1 for f in melenas if f["tipo"] == TIPO_PELUCA))
    esperado_arch["nutricion.xlsx"] = conteos(nutricion)
    esperado_arch["nutricion.xlsx"].update(anomalias=30)
    v2 = tamizaje + v2_extra
    esperado_arch["tamizaje-rosa_v2.xlsx"] = conteos(v2)
    esperado_arch["tamizaje-rosa_v2.xlsx"].update(anomalias=146)
    for n in ("reporte_final_2.xlsx", "tamizaje-rosa-reguardado.xlsx", "tamizaje-rosa.csv"):
        esperado_arch[n] = dict(esperado_arch["tamizaje-rosa.xlsx"])

    edades = [edad_en(p.nac, HOY) for p in personas.values() if p.id]
    globales = dict(
        personas_identificadas=163,
        registros_sin_identificar=0,
        cruce_tamizaje_melenas=15,
        pares_mismo_id=2,
        variantes_de_nombre=3,
        filas_compartidas_nutricion=30,
        edad_promedio=round(sum(edades) / len(edades), 1),
        impactadas={"tamizaje-rosa": 98, "melenas-en-movimiento": 20},
        donantes={"melenas-en-movimiento": 60},
        totales_finales=dict(atenciones=128, donaciones=60, pelucas=20,
                             personas=171, pares_pendientes=5,
                             personas_impactadas_global=126,
                             personas_en_mas_de_un_programa=15),
    )
    return tamizaje, melenas, nutricion, v2_extra, personas, {
        "archivos": esperado_arch, "globales": globales,
    }


# --- Escritura de archivos ------------------------------------------------------

def escribir_tamizaje(filas, ruta: Path, orden=None, extra=()):
    wb = Workbook()
    ws = wb.active
    encabezados = ["ID", "Nombre", "Estudio", "Edad", "Ciudad", "Asistencia", "Fecha"]
    if orden:
        encabezados = [encabezados[i] for i in orden]
    ws.append(encabezados)
    for f in list(filas) + list(extra):
        idv = f.get("id_malo", f["p"].id)
        celdas = {"ID": idv, "Nombre": f["p"].nombre, "Estudio": f["servicio"],
                  "Edad": edad_en(f["p"].nac, HOY), "Ciudad": f.get("ciudad", f["p"].ciudad),
                  "Asistencia": f["asistio"], "Fecha": f["fecha"]}
        ws.append([celdas[h] for h in encabezados])
    wb.save(ruta)


def escribir_melenas(filas, ruta: Path):
    wb = Workbook()
    ws = wb.active
    ws.append(["Melenas en Movimiento — registro de donaciones y entregas (ficticio)"])
    ws.append([])
    ws.append(["ID", "Nombre", "Edad", "Ciudad", "Fecha", "Tipo", "Largo (cm)"])
    for f in filas:
        ws.append([f["p"].id, f["p"].nombre, edad_en(f["p"].nac, HOY),
                   f.get("ciudad", f["p"].ciudad), f["fecha"], f["tipo"],
                   f["largo"] if f["largo"] is not None else ""])
    ws.append(["TOTAL", "", "", "", "", "", len(filas)])
    wb.save(ruta)


def escribir_nutricion(filas, ruta: Path):
    wb = Workbook()
    ws = wb.active
    ws.append(["ID", "Nombre", "Tipo de servicio", "Edad", "Ciudad", "Asistencia", "Fecha"])
    for f in filas:
        ws.append([f["p"].id, f["p"].nombre, f["servicio"], edad_en(f["p"].nac, HOY),
                   f.get("ciudad", f["p"].ciudad), f["asistio"], f["fecha"]])
    wb.save(ruta)


def escribir_csv(filas, ruta: Path):
    lineas = ["ID,Nombre,Estudio,Edad,Ciudad,Asistencia,Fecha"]
    for f in filas:
        fv = f["fecha"]
        ftxt = fv.isoformat() if isinstance(fv, date) else str(fv)
        lineas.append(",".join([
            f.get("id_malo", f["p"].id), f["p"].nombre.replace(",", " "),
            f["servicio"].replace(",", " "), str(edad_en(f["p"].nac, HOY)),
            f.get("ciudad", f["p"].ciudad).replace(",", " "), f["asistio"], ftxt]))
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")


def generar(directorio: str | Path = "reportes") -> dict:
    directorio = Path(directorio)
    directorio.mkdir(parents=True, exist_ok=True)
    tamizaje, melenas, nutricion, v2_extra, _personas, esperado = construir()

    escribir_tamizaje(tamizaje, directorio / "tamizaje-rosa.xlsx")
    escribir_melenas(melenas, directorio / "melenas-en-movimiento.xlsx")
    escribir_nutricion(nutricion, directorio / "nutricion.xlsx")
    shutil.copyfile(directorio / "tamizaje-rosa.xlsx", directorio / "reporte_final_2.xlsx")
    escribir_tamizaje(tamizaje, directorio / "tamizaje-rosa-reguardado.xlsx",
                      orden=[6, 0, 4, 1, 3, 2, 5])  # columnas en otro orden
    escribir_csv(tamizaje, directorio / "tamizaje-rosa.csv")
    escribir_tamizaje(tamizaje, directorio / "tamizaje-rosa_v2.xlsx", extra=v2_extra)

    esperado["archivos"]["reporte_final_2.xlsx"]["sha256_igual_a"] = "tamizaje-rosa.xlsx"
    (directorio / "esperado.json").write_text(
        json.dumps(esperado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return esperado


if __name__ == "__main__":
    gen = generar(sys.argv[1] if len(sys.argv) > 1 else "reportes")
    for nombre, e in gen["archivos"].items():
        print(f"{nombre}: {e['filas']} filas, {e['asistencias']} asistencias")
    print("globales:", json.dumps(gen["globales"], ensure_ascii=False))
