"""Lee un archivo, lo lleva al modelo común y señala problemas de calidad.

Es una función pura: no toca Valkey ni la base local. Las decisiones de
duplicados entre archivos las toma `importar.py`.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
from dataclasses import dataclass, field

from .catalogos import Catalogo
from .leer import Tabla, leer_tabla
from .mapeo import mapear
from .texto import (edad_en, es_vacio, folio_valido, iniciales, norm, parse_edad, parse_fecha, parse_id)

SI = {"si", "s", "1", "x", "asistio", "asistio si", "presente", "true", "verdadero", "yes"}
NO = {"no", "n", "0", "falto", "inasistencia", "ausente", "false", "falso"}


def h(llave: bytes, *partes: str, n: int = 15) -> str:
    return hmac.new(llave, "|".join(partes).encode(), hashlib.sha256).hexdigest()[:n]


def h_completo(llave: bytes, *partes: str) -> str:
    return hmac.new(llave, "|".join(partes).encode(), hashlib.sha256).hexdigest()


@dataclass
class Fila:
    fila: int
    id_h: str = ""            # HMAC del ID de EIRA ('' = sin persona identificada)
    nombre_h: str = ""
    nombre_norm: str = ""     # solo en la base local, nunca en Valkey
    etiqueta: str = ""        # iniciales · ciudad · edad
    ciudad: str = ""
    servicio: str = ""
    fecha: str = ""
    periodo: str = ""
    asistencia: int = 1
    cantidad: int = 1
    nac: str = ""
    edad: int | None = None
    folio: int = 0
    huella: str = ""          # '' si no hay ID ni nombre: no se deduplica por fila
    canon_huella: str = ""    # siempre presente: alimenta la huella canónica del archivo


@dataclass
class Analisis:
    sha256: str
    canon: str
    formato: str
    encabezados: list[str]
    mapeo: list[dict]
    ignoradas: list[str]
    filas: list[Fila]
    anomalias: list[dict] = field(default_factory=list)
    totales_excluidas: int = 0
    avisos: list[str] = field(default_factory=list)


def analizar(contenido: bytes, fecha_corte: str, llave: bytes, ciudades: Catalogo,
             servicios: Catalogo, hoy: dt.date | None = None) -> Analisis:
    hoy = hoy or dt.date.today()
    corte = parse_fecha(fecha_corte) or hoy
    tabla: Tabla = leer_tabla(contenido)
    mapeo = mapear(tabla.encabezados)
    if not any(d["campo"] == "id_eira" for d in mapeo):
        # Encabezado desconocido: si una columna sin mapear trae IDs de EIRA, se usa (probabilidad menor).
        usados = {d["indice"] for d in mapeo}
        for i, enc in enumerate(tabla.encabezados):
            if i in usados or es_vacio(enc):
                continue
            vals = [c[i] for _, c in tabla.filas[:200] if i < len(c) and not es_vacio(c[i])]
            if vals and sum(1 for x in vals if parse_id(x, hoy)) / len(vals) >= 0.6:
                mapeo.append({"encabezado": str(enc).strip(), "campo": "id_eira", "probabilidad": 0.6, "indice": i})
                break
        mapeo.sort(key=lambda d: d["indice"])
    col = {d["campo"]: d["indice"] for d in mapeo}
    usadas = {d["indice"] for d in mapeo}
    ignoradas = [str(e).strip() for i, e in enumerate(tabla.encabezados) if i not in usadas and not es_vacio(e)]

    a = Analisis(
        sha256=hashlib.sha256(contenido).hexdigest(), canon="", formato=tabla.formato,
        encabezados=[norm(e) for e in tabla.encabezados if not es_vacio(e)],
        mapeo=[{k: v for k, v in d.items() if k != "indice"} for d in mapeo],
        ignoradas=ignoradas, filas=[], totales_excluidas=tabla.totales_excluidas,
    )
    if "id_eira" not in col:
        a.avisos.append("El archivo no trae ID de EIRA: ninguna fila identifica a una persona.")
    if "fecha" not in col:
        a.avisos.append("El archivo no trae columna de fecha de servicio.")
    if "ciudad" not in col:
        a.avisos.append("El archivo no trae columna de municipio.")

    def anom(fila, regla, campo, detalle):
        a.anomalias.append({"fila": fila, "regla": regla, "campo": campo, "detalle": detalle})

    for num, celdas in tabla.filas:
        def v(campo):
            i = col.get(campo)
            return celdas[i] if i is not None and i < len(celdas) else None

        f = Fila(fila=num)

        # --- Persona ---
        crudo_id, nac = v("id_eira"), None
        pid = parse_id(crudo_id, hoy)
        if pid:
            canon_id, nac = pid
            f.id_h = h(llave, "id", canon_id)
        elif "id_eira" in col:
            if es_vacio(crudo_id):
                anom(num, "faltante", "id_eira", "ID de EIRA vacío")
            else:
                anom(num, "id_invalido", "id_eira", "El ID no tiene el formato iniciales + AAAAMMDD")
        canon_id = pid[0] if pid else ""

        nombre = "" if es_vacio(v("nombre")) else str(v("nombre")).strip()
        f.nombre_norm = norm(nombre)
        f.nombre_h = h(llave, "nombre", f.nombre_norm, n=12) if f.nombre_norm else ""
        if "nombre" in col and not nombre:
            anom(num, "faltante", "nombre", "Nombre vacío")

        nac_col = None
        if "fecha_nacimiento" in col:
            if es_vacio(v("fecha_nacimiento")):
                if not pid:
                    anom(num, "faltante", "fecha_nacimiento", "Fecha de nacimiento vacía")
            else:
                nac_col = parse_fecha(v("fecha_nacimiento"))
                if nac_col is None or nac_col > hoy:
                    anom(num, "fecha_invalida", "fecha_nacimiento", "Fecha de nacimiento no reconocida")
                    nac_col = None
        if pid and nac_col and nac_col != nac:
            anom(num, "id_invalido", "id_eira", "La fecha del ID no coincide con la fecha de nacimiento")
        nac = nac or nac_col
        f.nac = nac.isoformat() if nac else ""

        # --- Servicio, fecha, ciudad ---
        fecha = None
        if "fecha" in col:
            if es_vacio(v("fecha")):
                anom(num, "faltante", "fecha", "Fecha de servicio vacía")
            else:
                fecha = parse_fecha(v("fecha"))
                if fecha is None:
                    anom(num, "fecha_invalida", "fecha", "Formato de fecha no reconocido")
                elif fecha > corte or fecha > hoy:
                    anom(num, "fecha_futura", "fecha", "La fecha de servicio es posterior al corte")
        f.fecha = fecha.isoformat() if fecha else ""
        f.periodo = f.fecha[:7]

        crudo_ciudad = v("ciudad")
        ciudad_clave = ""
        if "ciudad" in col:
            if es_vacio(crudo_ciudad):
                anom(num, "faltante", "ciudad", "Municipio vacío")
            else:
                canon, nivel = ciudades.resolver(str(crudo_ciudad))
                if nivel == "exacto":
                    f.ciudad = canon
                elif nivel == "aproximado":
                    f.ciudad = canon
                    anom(num, "posible_correccion", "ciudad", f"Texto parecido a «{canon}»")
                else:
                    anom(num, "ciudad_desconocida", "ciudad", "Municipio no reconocido en el catálogo")
                ciudad_clave = f.ciudad or norm(crudo_ciudad)

        crudo_serv = v("servicio") if not es_vacio(v("servicio")) else v("estudio")
        if ("servicio" in col or "estudio" in col):
            if es_vacio(crudo_serv):
                anom(num, "faltante", "servicio", "Servicio vacío")
            else:
                canon, nivel = servicios.resolver(str(crudo_serv))
                if canon:
                    f.servicio = canon
                    if nivel == "aproximado":
                        anom(num, "posible_correccion", "servicio", f"Texto parecido a «{canon}»")
                else:
                    f.servicio = str(crudo_serv).strip()[:1].upper() + str(crudo_serv).strip()[1:]

        # --- Asistencia y cantidad ---
        if "asistencia" in col:
            t = norm(v("asistencia"))
            if t in NO:
                f.asistencia = 0
            elif t not in SI:
                anom(num, "faltante", "asistencia", "Asistencia vacía o no reconocida")
        try:
            f.cantidad = max(1, int(float(v("cantidad")))) if not es_vacio(v("cantidad")) else 1
        except (TypeError, ValueError):
            f.cantidad = 1

        # --- Edad ---
        edad = parse_edad(v("edad"))
        if edad is not None and not (0 <= edad <= 110):
            anom(num, "edad_inconsistente", "edad", "Edad fuera de rango")
            edad = None
        if nac is not None:
            calculada = edad_en(nac, min(corte, hoy))
            if edad is not None and abs(calculada - edad) > 1:
                anom(num, "edad_inconsistente", "edad", "La edad no coincide con la fecha de nacimiento")
            edad = calculada
        f.edad = edad

        # --- Folio ---
        if "folio" in col and not es_vacio(v("folio")):
            if folio_valido(v("folio")):
                f.folio = 1
            else:
                anom(num, "id_invalido", "folio", "Folio con formato o dígito verificador incorrecto")

        f.etiqueta = " · ".join(x for x in (
            iniciales(nombre), f.ciudad, f"{edad} años" if edad is not None else "") if x)

        # --- Huellas (no dependen del archivo, del orden de columnas ni del formato) ---
        partes = (canon_id, f.nombre_norm, ciudad_clave, norm(f.servicio), f.fecha,
                  str(f.asistencia), str(f.cantidad))
        completa = h_completo(llave, "fila", *partes)
        f.huella = completa if (canon_id or f.nombre_norm) else ""
        a.filas.append(f)
        f.canon_huella = completa

    a.canon = hashlib.sha256("\n".join(sorted(f.canon_huella for f in a.filas)).encode()).hexdigest()
    return a
