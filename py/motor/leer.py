"""Lectura de reportes Excel/CSV de EIRA.

Detecta la fila de encabezados (aunque el archivo traiga titulo arriba),
mapea columnas por un diccionario de encabezados conocidos y normaliza a:

    fila, id_eira, id_valido, nombre_norm, servicio, tipo_texto, edad,
    ciudad, estado_clave, estado, municipio_clave, municipio,
    asistio, fecha, periodo, cantidad

El lugar se resuelve contra el catalogo INEGI nacional: clave de municipio
directa si el archivo la trae, o la ciudad dentro del estado del trabajo
(o el de la columna de estado, que manda), con alias de uso comun.

Devuelve (DataFrame, anomalias). El DataFrame trae en attrs:
    mapeo: lista de {encabezado, campo, probabilidad}
    sin_personas: True si no se encontro columna de ID ni de nombre
    hoja: nombre de la hoja leida

Nunca sale de aqui el nombre ni el ID en claro: solo via huellas HMAC.
"""
import csv as _csv
import io
import re
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

from db import catalogo

# --- Diccionario de encabezados ------------------------------------------------

CAMPOS = {
    "id": {"id", "id usuario", "idusuario", "id_usuario", "id de usuario",
           "id eira", "id_eira", "ideira", "identificador", "folio",
           "id participante", "id paciente", "id usuaria"},
    "nombre": {"nombre", "nombre completo", "nombrecompleto", "participante",
               "paciente", "usuaria", "nombre de la paciente", "beneficiaria",
               "nombre y apellidos", "donante", "donadora"},
    "servicio": {"estudio", "tipo de servicio", "servicio", "taller",
                 "tipo servicio", "estudio o servicio", "estudio/servicio",
                 "tipo de estudio", "servicio otorgado"},
    "tipo": {"tipo", "tipo de registro", "tipo registro", "movimiento",
             "tipo de movimiento"},
    "edad": {"edad", "edad anios", "edad años"},
    "ciudad": {"ciudad", "municipio", "localidad", "municipio o localidad"},
    "estado": {"estado", "entidad", "entidad federativa",
               "estado de residencia", "entidad de residencia"},
    "municipio_clave": {"cvegeo", "cvegeo resid", "cve geo", "cvegeo residencia",
                        "cvegeo de residencia", "clave geoestadistica",
                        "clave geoestadistica del municipio"},
    "entidad_clave": {"clave entidad", "cve entidad", "cve ent",
                      "clave de entidad"},
    "municipio_corto": {"clave municipio", "cve municipio", "cve mun",
                        "clave de municipio"},
    "asistio": {"asistencia", "asistio", "asistió"},
    "fecha": {"fecha", "fecha evento", "fecha_evento", "fechaevento",
              "fecha de evento", "fecha servicio", "fecha de servicio",
              "fecha atencion", "fecha de atencion"},
}

# Encabezados que significan "cuantas cosas cuenta esta fila" en reportes sin
# identificador de persona.
CAMPOS_CONTEO = {"total", "cantidad", "conteo", "registros", "casos",
                 "defunciones", "defunciones mujeres", "defunciones_mujeres",
                 "egresos", "personas", "eventos", "unidades",
                 "estudios realizados", "estudios_realizados", "n"}

MESES = ("ene", "feb", "mar", "abr", "may", "jun",
         "jul", "ago", "sep", "oct", "nov", "dic")


def norm(texto) -> str:
    """Minusculas, sin acentos, espacios colapsados."""
    if texto is None:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


def _norm_encabezado(texto) -> str:
    return re.sub(r"[_\-./]+", " ", norm(texto)).strip()


def _parse_fecha(v):
    """Devuelve (fecha_iso, valida). Acepta datetime, serial de Excel y textos."""
    if v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == "":
        return None, True
    if isinstance(v, (datetime, date, pd.Timestamp)):
        return pd.Timestamp(v).strftime("%Y-%m-%d"), True
    if isinstance(v, (int, float)):
        if 20000 <= v <= 60000:  # serial de Excel
            return (date(1899, 12, 30) + timedelta(days=int(v))).isoformat(), True
        return None, False
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%Y/%m/%d",
                "%d %b %Y", "%d de %B de %Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d"), True
        except ValueError:
            pass
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        try:
            return date.fromisoformat(s).isoformat(), True
        except ValueError:
            return None, False
    return None, False


ID_RE = re.compile(r"^[A-ZÑ]{3}(\d{8})$")


def _id_valido(id_eira: str) -> bool:
    m = ID_RE.match(id_eira)
    if not m:
        return False
    try:
        date(int(m.group(1)[:4]), int(m.group(1)[4:6]), int(m.group(1)[6:8]))
        return True
    except ValueError:
        return False


SI = {"si", "sí", "x", "1", "yes", "true", "verdadero", "presente", "v"}
NO = {"no", "0", "false", "falso", "ausente", "falta"}


def _puntaje_encabezados(fila) -> int:
    return sum(1 for c in fila if _norm_encabezado(c) in
               {h for hs in CAMPOS.values() for h in hs})


def _leer_tabla(contenido: bytes, nombre: str) -> tuple[pd.DataFrame, str]:
    """Tabla cruda (sin encabezado aplicado) y nombre de hoja."""
    if nombre.lower().endswith(".csv"):
        texto = contenido.decode("utf-8-sig", errors="replace")
        return pd.read_csv(io.StringIO(texto), header=None, dtype=object), "csv"
    libro = pd.ExcelFile(io.BytesIO(contenido), engine="openpyxl")
    mejor, mejor_hoja, mejor_score = None, libro.sheet_names[0], -1
    for hoja in libro.sheet_names:
        t = pd.read_excel(libro, sheet_name=hoja, header=None, dtype=object)
        score = max((_puntaje_encabezados(t.iloc[i]) for i in range(min(10, len(t)))),
                    default=0)
        if score > mejor_score:
            mejor, mejor_hoja, mejor_score = t, hoja, score
    return mejor, mejor_hoja


def leer_reporte(contenido: bytes, nombre: str,
                 estado_clave: str = "14") -> tuple[pd.DataFrame, list[dict]]:
    tabla, hoja = _leer_tabla(contenido, nombre)

    # Fila de encabezados: la de mayor puntaje entre las primeras 10.
    puntajes = [(i, _puntaje_encabezados(tabla.iloc[i]))
                for i in range(min(10, len(tabla)))]
    i_enc, score = max(puntajes, key=lambda x: x[1]) if puntajes else (0, 0)
    if score < 2:
        i_enc = 0  # archivo sin encabezados reconocibles: se intenta igual

    encabezados = [str(c).strip() if not pd.isna(c) else f"col{j}"
                   for j, c in enumerate(tabla.iloc[i_enc])]
    datos = tabla.iloc[i_enc + 1:].reset_index(drop=True)
    datos.columns = encabezados

    mapeo, col_campo = [], {}
    usados = set()
    for enc in encabezados:
        campo = next((c for c, hs in CAMPOS.items() if _norm_encabezado(enc) in hs
                      and c not in usados), None)
        col_campo[enc] = campo
        if campo:
            usados.add(campo)
            mapeo.append({"encabezado": enc, "campo": campo, "probabilidad": 0.97})

    sin_personas = "id" not in usados and "nombre" not in usados
    trae_ciudad = "ciudad" in usados

    anomalias, filas = [], []
    for idx, raw in datos.iterrows():
        num_fila = int(idx) + i_enc + 2  # fila 1-based en el archivo original
        celdas = {enc: (None if pd.isna(v) else v) for enc, v in raw.items()}

        def col(campo):
            return next((celdas[e] for e, c in col_campo.items() if c == campo), None)

        # Descartar filas vacias y filas de TOTAL.
        vacia = all(v is None or str(v).strip() == "" for v in celdas.values())
        primera = norm(next((v for v in celdas.values() if v is not None), ""))
        if vacia or primera in ("total", "totales", "total general"):
            continue

        id_crudo = str(col("id") or "").strip().upper()
        nombre_crudo = str(col("nombre") or "").strip()
        nombre_norm = norm(nombre_crudo)
        id_valido = bool(id_crudo) and _id_valido(id_crudo)

        if not sin_personas:
            if not id_crudo:
                anomalias.append({"fila": num_fila, "regla": "faltante", "campo": "id",
                                  "detalle": "Fila sin ID de EIRA"})
            elif not id_valido:
                anomalias.append({"fila": num_fila, "regla": "id_invalido", "campo": "id",
                                  "detalle": "El ID no cumple el formato de EIRA"})
                id_crudo = ""

        fv, f_ok = _parse_fecha(col("fecha"))
        if not f_ok:
            anomalias.append({"fila": num_fila, "regla": "fecha_invalida", "campo": "fecha",
                              "detalle": "Formato de fecha no reconocido"})

        ciudad_cruda = str(col("ciudad") or "").strip()
        lugar = catalogo.resolver_lugar(
            ciudad_cruda, estado_clave,
            estado_texto=str(col("estado") or ""),
            municipio_clave=str(col("municipio_clave") or ""),
            entidad_clave=str(col("entidad_clave") or ""),
            municipio_corto=str(col("municipio_corto") or ""))
        if trae_ciudad and ciudad_cruda and not lugar["resuelto"]:
            anomalias.append({"fila": num_fila, "regla": "ciudad_desconocida",
                              "campo": "ciudad",
                              "detalle": "Municipio no reconocido en el catalogo"})

        av = norm(col("asistio"))
        asistio = av not in NO  # vacio u otro valor cuentan como asistencia

        edad = None
        ev = col("edad")
        if ev is not None:
            try:
                edad = int(float(ev))
            except (TypeError, ValueError):
                pass

        tipo_texto = str(col("tipo") or "").strip()

        if sin_personas:
            # Sin identificador: una fila cuenta 1, salvo que una columna
            # traiga el conteo agregado ("defunciones_mujeres", "total", …).
            cantidad = 1.0
            for e, v in celdas.items():
                if col_campo.get(e) is not None or v is None:
                    continue
                if _norm_encabezado(e) in CAMPOS_CONTEO:
                    try:
                        cantidad = float(str(v).replace(",", "."))
                    except (TypeError, ValueError):
                        pass
                    break
            # La huella usa todas las celdas: sin persona ni fecha, deduplicar
            # solo por los campos mapeados colapsaria filas distintas.
            contenido_fila = "|".join(norm(v) for v in celdas.values())
        else:
            cantidad = 1.0 if asistio else 0.0
            contenido_fila = ""

        filas.append({
            "fila": num_fila, "id_eira": id_crudo if id_valido else "",
            "id_valido": id_valido, "nombre_norm": nombre_norm,
            "servicio": str(col("servicio") or "").strip() or tipo_texto,
            "tipo_texto": tipo_texto, "edad": edad,
            "ciudad": ciudad_cruda,
            "estado_clave": lugar["estado_clave"], "estado": lugar["estado"],
            "municipio_clave": lugar["municipio_clave"],
            "municipio": lugar["municipio"],
            "asistio": asistio, "fecha": fv,
            "periodo": (fv or "")[:7], "cantidad": float(cantidad),
            "contenido_fila": contenido_fila,
        })

    df = pd.DataFrame(filas, columns=["fila", "id_eira", "id_valido", "nombre_norm",
                                      "servicio", "tipo_texto", "edad", "ciudad",
                                      "estado_clave", "estado", "municipio_clave",
                                      "municipio", "asistio", "fecha", "periodo",
                                      "cantidad", "contenido_fila"])
    df.attrs["mapeo"] = mapeo
    df.attrs["sin_personas"] = sin_personas
    df.attrs["hoja"] = hoja
    return df, anomalias
