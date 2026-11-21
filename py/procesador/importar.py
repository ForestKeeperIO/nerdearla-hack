"""Deduplicación en tres capas y alta de una fuente en la base local."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from dataclasses import dataclass, field

from .analizar import Analisis, h
from .texto import fecha_es, similitud

UMBRAL_VERSION = 0.90
UMBRAL_TRASLAPE = 0.30
IGNORAR = {"posible_correccion", "fila_ya_cargada", "fila_repetida"}


@dataclass
class Resultado:
    estado: str                 # listo | duplicado
    nivel: str                  # identico | mismo_contenido | version_nueva | traslape_parcial | distinto
    mensaje: str
    fuente: str = ""
    fuente_original: str = ""
    filas: int = 0
    nuevas: int = 0
    omitidas: int = 0
    repetidas: int = 0
    pares_nuevos: list[str] = field(default_factory=list)
    sin_persona: int = 0


def _fecha_carga(con, fid: str) -> str:
    r = con.execute("SELECT cargada_en FROM fuentes WHERE id=?", (fid,)).fetchone()
    return fecha_es(dt.datetime.fromtimestamp(r["cargada_en"], dt.timezone.utc).date())


def _nombre(con, fid: str) -> str:
    return con.execute("SELECT nombre FROM fuentes WHERE id=?", (fid,)).fetchone()["nombre"]


def _puntaje(n: int, sin_persona: int, con_problema: int) -> tuple[int, int]:
    if n == 0:
        return 0, 1
    p = round(100 * (1 - 0.5 * sin_persona / n - 1.0 * con_problema / n))
    p = max(0, min(100, p))
    est = 5 if p >= 90 else 4 if p >= 80 else 3 if p >= 65 else 2 if p >= 50 else 1
    return p, est


def importar(con, a: Analisis, job: dict, llave: bytes, ahora: dt.datetime | None = None) -> Resultado:
    """Decide qué pasa con el archivo y, si hay filas nuevas, las guarda."""
    ahora = ahora or dt.datetime.now(dt.timezone.utc)
    nombre, trabajo = job["nombre"], job["id"]

    # Capa 1a: mismos bytes, con cualquier nombre.
    r = con.execute("SELECT id FROM fuentes WHERE sha256=?", (a.sha256,)).fetchone()
    if r:
        return Resultado("duplicado", "identico",
                         f"Este archivo ya se cargó el {_fecha_carga(con, r['id'])} como "
                         f"'{_nombre(con, r['id'])}'. No se vuelve a cargar.",
                         fuente_original=r["id"], filas=len(a.filas), omitidas=len(a.filas))
    # Capa 1b: mismo contenido (re-guardado, columnas en otro orden, exportado a CSV).
    r = con.execute("SELECT id, encabezados, formato FROM fuentes WHERE canon=?", (a.canon,)).fetchone()
    if r:
        viejo = json.loads(r["encabezados"])
        if r["formato"] != a.formato:
            detalle = f", en {a.formato.upper()}."
        elif viejo == a.encabezados:
            detalle = " (archivo vuelto a guardar)."
        elif sorted(viejo) == sorted(a.encabezados):
            detalle = " (las columnas venían en otro orden)."
        else:
            detalle = " (con otros encabezados)."
        msg = f"Mismo contenido que '{_nombre(con, r['id'])}'{detalle} No hay nada nuevo."
        return Resultado("duplicado", "mismo_contenido", msg,
                         fuente_original=r["id"], filas=len(a.filas), omitidas=len(a.filas))

    # Capa 2: filas que ya existen en otras fuentes, o repetidas dentro del archivo.
    estados, dueno = {}, {}        # fila -> estado ; fila -> (fuente, fila)
    vistas: dict[str, int] = {}
    por_fuente: dict[str, int] = {}
    unicas = set()
    for f in a.filas:
        if not f.huella:
            estados[f.fila] = "contada"
            continue
        if f.huella in vistas:
            estados[f.fila] = "repetida"
            dueno[f.fila] = (None, vistas[f.huella])
            continue
        vistas[f.huella] = f.fila
        unicas.add(f.huella)
        ya = con.execute("SELECT fuente, fila FROM filas WHERE huella=? AND estado='contada' "
                         "ORDER BY rid LIMIT 1", (f.huella,)).fetchone()
        if ya:
            estados[f.fila] = "omitida"
            dueno[f.fila] = (ya["fuente"], ya["fila"])
            por_fuente[ya["fuente"]] = por_fuente.get(ya["fuente"], 0) + 1
        else:
            estados[f.fila] = "contada"

    n_omit = sum(1 for s in estados.values() if s == "omitida")
    n_rep = sum(1 for s in estados.values() if s == "repetida")
    n_nuevas = sum(1 for s in estados.values() if s == "contada")
    original, pct = "", 0.0
    if por_fuente and unicas:
        original = max(por_fuente, key=por_fuente.get)
        pct = por_fuente[original] / len(unicas)

    nivel = "distinto"
    if n_omit:
        nivel = "version_nueva" if pct >= UMBRAL_VERSION else "traslape_parcial" if pct >= UMBRAL_TRASLAPE else "distinto"

    rep = f" {n_rep} filas repetidas dentro del archivo: se cuentan una vez." if n_rep else ""
    extra = ""
    if a.totales_excluidas:
        extra += f" Se excluyó {a.totales_excluidas} fila de totales." if a.totales_excluidas == 1 \
            else f" Se excluyeron {a.totales_excluidas} filas de totales."
    if a.ignoradas:
        extra += " Columnas sin usar: " + ", ".join(a.ignoradas) + "."

    if n_nuevas == 0:
        msg = (f"Todas las filas ya estaban en '{_nombre(con, original)}'. No hay nada nuevo." if original
               else "No hay filas para agregar.")
        return Resultado("duplicado", nivel, msg + rep + extra, fuente_original=original,
                         filas=len(a.filas), omitidas=n_omit, repetidas=n_rep)

    if nivel == "version_nueva":
        msg = (f"Parece una versión nueva de '{_nombre(con, original)}': {n_omit} filas ya estaban y se omiten; "
               f"se agregan {n_nuevas}.")
    elif nivel == "traslape_parcial":
        msg = (f"Comparte {n_omit} filas con '{_nombre(con, original)}'. Se cuentan una sola vez. "
               "Revísalas en Calidad si eran servicios distintos.")
    elif n_omit:
        msg = (f"Se agregaron {n_nuevas} filas; {n_omit} ya estaban en '{_nombre(con, original)}' y se omiten. "
               "Revísalas en Calidad.")
    else:
        msg = f"Se agregaron {n_nuevas} filas."

    # --- Guardar la fuente ---
    fid = "f-" + hashlib.sha1(f"{a.sha256}|{trabajo}".encode()).hexdigest()[:10]
    anoms = list(a.anomalias)
    for f in a.filas:
        s = estados[f.fila]
        if s == "repetida":
            anoms.append({"fila": f.fila, "regla": "fila_repetida", "campo": "",
                          "detalle": "Fila idéntica a otra dentro del mismo archivo"})
        elif s == "omitida" and nivel in ("traslape_parcial", "distinto"):
            anoms.append({"fila": f.fila, "regla": "fila_ya_cargada", "campo": "",
                          "detalle": "La fila ya estaba en otro archivo y no se vuelve a contar"})

    contadas = [f for f in a.filas if estados[f.fila] == "contada"]
    sin_persona = sum(1 for f in contadas if not f.id_h)
    con_problema = len({x["fila"] for x in anoms if x["regla"] not in IGNORAR
                        and estados.get(x["fila"]) == "contada"})
    inasist = sum(1 for f in contadas if not f.asistencia)
    puntaje, estrellas = _puntaje(len(contadas), sin_persona, con_problema)
    motivos = []
    if sin_persona:
        motivos.append(f"{sin_persona} registros sin persona identificada")
    if con_problema:
        motivos.append(f"{con_problema} filas con anomalías de calidad")
    if n_omit:
        motivos.append(f"{n_omit} filas omitidas porque ya estaban en '{_nombre(con, original)}'")
    if n_rep:
        motivos.append(f"{n_rep} filas repetidas dentro del archivo")
    if inasist:
        motivos.append(f"{inasist} inasistencias registradas")
    motivos += a.avisos
    if not motivos:
        motivos.append("Datos completos y consistentes")

    with con:
        con.execute("INSERT INTO fuentes VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            fid, nombre, job["programa"], job["unidad"], job.get("fecha_corte", ""),
            int(ahora.timestamp()), job.get("por", ""), a.sha256, a.canon, json.dumps(a.encabezados),
            a.formato, estrellas, puntaje, json.dumps(motivos, ensure_ascii=False), trabajo))
        for f in a.filas:
            s = estados[f.fila]
            yf, yfila = dueno.get(f.fila, (None, None))
            con.execute(
                "INSERT INTO filas(fuente,fila,id_h,nombre_h,nombre_norm,etiqueta,ciudad,servicio,periodo,fecha,"
                "tipo,asistencia,cantidad,nac,edad,folio,huella,estado,ya_en_fuente,ya_en_fila) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (fid, f.fila, f.id_h, f.nombre_h, f.nombre_norm, f.etiqueta, f.ciudad, f.servicio, f.periodo,
                 f.fecha, f.tipo, f.asistencia, f.cantidad, f.nac, f.edad, f.folio, f.huella, s,
                 yf or fid if s != "contada" else None, yfila))
        for x in anoms:
            con.execute("INSERT INTO anomalias VALUES(?,?,?,?,?)",
                        (fid, x["fila"], x["regla"], x["campo"], x["detalle"]))
        nuevos = _detectar_pares(con, {f.id_h for f in contadas if f.id_h}, llave)

    return Resultado("listo", nivel, msg + rep + extra, fuente=fid, fuente_original=original,
                     filas=len(a.filas), nuevas=n_nuevas, omitidas=n_omit, repetidas=n_rep,
                     pares_nuevos=nuevos, sin_persona=sin_persona)


def _detectar_pares(con, ids: set[str], llave: bytes) -> list[str]:
    """Mismo ID con nombres distintos: se pregunta a una persona, no se resuelve solo."""
    creados = []
    for id_h in ids:
        filas = con.execute("SELECT fuente, fila, nombre_h, nombre_norm, etiqueta FROM filas "
                            "WHERE id_h=? AND estado='contada' AND nombre_h!='' ORDER BY rid", (id_h,)).fetchall()
        grupos: dict[str, object] = {}
        for r in filas:
            grupos.setdefault(r["nombre_h"], r)
        if len(grupos) < 2:
            continue
        a = next(iter(grupos.values()))
        for r in list(grupos.values())[1:]:
            pid = "par-" + hashlib.sha1(f"{id_h}|{a['nombre_h']}|{r['nombre_h']}".encode()).hexdigest()[:8]
            if con.execute("SELECT 1 FROM pares WHERE id=?", (pid,)).fetchone():
                continue
            motivo = ("Posible variante de escritura" if similitud(a["nombre_norm"], r["nombre_norm"]) >= 0.85
                      else "Mismo ID, nombres distintos")
            con.execute("INSERT INTO pares VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", (
                pid, "pendiente", motivo, id_h, a["nombre_h"], r["nombre_h"],
                a["fuente"], a["fila"], a["etiqueta"], r["fuente"], r["fila"], r["etiqueta"]))
            creados.append(pid)
    return creados
