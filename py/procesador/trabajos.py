"""Ciclo de un trabajo y de una decisión humana contra Valkey."""
from __future__ import annotations

import datetime as dt
import json
import logging
import traceback

from .analizar import analizar
from .catalogos import cargar_ciudades, cargar_servicios
from .importar import importar
from .iniciativas import Catalogo
from .leer import ErrorArchivo
from .proyeccion import proyectar

log = logging.getLogger("eira.procesador")


def _ahora() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _s(x) -> str:
    return x.decode() if isinstance(x, bytes) else str(x)


def _campos(msg: dict) -> dict:
    return {_s(k): _s(val) for k, val in msg.items()}


def avisar(v, tipo: str, id_: str):
    v.publish("eira:eventos", json.dumps({"tipo": tipo, "id": id_}))


def bitacora(v, por: str, tipo: str, detalle: str):
    v.xadd("eira:bitacora", {"en": _ahora(), "por": por or "procesamiento", "tipo": tipo, "detalle": detalle})


def _terminar(v, t: str, estado: str, mensaje: str, **extra):
    campos = {"estado": estado, "mensaje": mensaje, "terminado_en": _ahora(), **extra}
    v.hset(f"eira:trabajo:{t}", mapping={k: str(val) for k, val in campos.items()})
    avisar(v, "trabajo", t)


class Procesador:
    def __init__(self, v, con, llave: bytes):
        self.v, self.con, self.llave = v, con, llave
        self.ciudades, self.servicios = cargar_ciudades(), cargar_servicios()
        self.catalogo = Catalogo()

    # --- Archivos subidos ---
    def procesar_trabajo(self, job: dict) -> None:
        v, t = self.v, job["id"]
        v.hset(f"eira:trabajo:{t}", mapping={"estado": "procesando"})
        avisar(v, "trabajo", t)
        try:
            ini = self.catalogo.programa(job.get("programa", ""))
            if ini is None:
                return _terminar(v, t, "error", f"El programa '{job.get('programa', '')}' no está en el catálogo de EIRA.")
            if job.get("unidad") not in ini.tipos:
                etiquetas = ", ".join(self.catalogo.tipos[x]["plural"] for x in ini.tipos)
                return _terminar(v, t, "error", f"{ini.nombre} no admite ese tipo de registro. Admite: {etiquetas}.")
            job = {**job, "programa": ini.id}
            ya = self.con.execute("SELECT id FROM fuentes WHERE trabajo=?", (t,)).fetchone()
            if ya:  # mensaje reentregado: ya se importó
                return _terminar(v, t, "listo", "Este trabajo ya se había procesado.", fuente=ya["id"])
            contenido = v.get(f"eira:archivo:{t}")
            if contenido is None:
                return _terminar(v, t, "error", "El archivo ya no está disponible (caducó). Vuelve a subirlo.")
            a = analizar(contenido, job.get("fecha_corte", ""), self.llave, self.ciudades, self.servicios,
                         tipo_defecto=job["unidad"], iniciativas=self.catalogo, programa_id=ini.id)
            r = importar(self.con, a, job, self.llave)
            if r.estado == "listo":
                proyectar(v, self.con, self.llave, self.catalogo)
                avisar(v, "fuente", r.fuente)
                avisar(v, "persona", "todas")
                for p in r.pares_nuevos:
                    avisar(v, "persona", p)
                tipo = "carga" if r.nivel == "distinto" and not r.omitidas else r.nivel
                bitacora(v, job.get("por"), tipo, f"'{job['nombre']}': {r.mensaje}")
                if r.pares_nuevos:
                    bitacora(v, "procesamiento", "pares",
                             f"Se detectaron {len(r.pares_nuevos)} pares de personas que podrían ser la misma; "
                             "esperan decisión.")
                if r.sin_persona:
                    bitacora(v, "procesamiento", "sin_identificar",
                             f"{r.sin_persona} registros de '{job['nombre']}' quedaron sin persona identificada.")
            else:
                bitacora(v, job.get("por"), "duplicado", f"Se rechazó '{job['nombre']}': {r.mensaje}")
            _terminar(v, t, r.estado, r.mensaje, nivel_duplicado=r.nivel, fuente=r.fuente,
                      fuente_original=r.fuente_original, filas=r.filas, filas_nuevas=r.nuevas,
                      filas_omitidas=r.omitidas, filas_repetidas=r.repetidas,
                      mapeo=json.dumps(a.mapeo, ensure_ascii=False))
        except ErrorArchivo as e:
            _terminar(v, t, "error", str(e))
        except Exception:
            log.error("Fallo procesando %s\n%s", t, traceback.format_exc())
            _terminar(v, t, "error", "No pude procesar el archivo por un error interno. "
                      "Avisa al equipo técnico con el nombre del archivo.")

    # --- Decisiones humanas ---
    def aplicar_decision(self, d: dict) -> None:
        v, con = self.v, self.con
        por = d.get("por", "")
        if d.get("tipo") == "persona":
            par, dec = d.get("par", ""), d.get("decision", "")
            if dec not in ("misma", "distinta") or not con.execute("SELECT 1 FROM pares WHERE id=?", (par,)).fetchone():
                log.warning("Decisión de persona inválida: %s", d)
                return
            with con:
                con.execute("UPDATE pares SET estado=? WHERE id=?", (dec, par))
            bitacora(v, por, "decision_persona", f"Se decidió que el par {par} es {'la misma persona' if dec == 'misma' else 'personas distintas'}.")
            proyectar(v, con, self.llave, self.catalogo)
            avisar(v, "persona", par)
        elif d.get("tipo") == "restituir_fila":
            fuente, fila = d.get("fuente", ""), d.get("fila", "")
            r = con.execute("SELECT rid, estado FROM filas WHERE fuente=? AND fila=?", (fuente, int(fila or 0))).fetchone()
            if not r or r["estado"] == "contada":
                log.warning("Restitución inválida: %s", d)
                return
            with con:
                con.execute("UPDATE filas SET estado='contada', ya_en_fuente=NULL, ya_en_fila=NULL WHERE rid=?", (r["rid"],))
            bitacora(v, por, "restituir_fila", f"Se contó de todos modos la fila {fila} de {fuente}.")
            proyectar(v, con, self.llave, self.catalogo)
            avisar(v, "fuente", fuente)
            avisar(v, "persona", "todas")
        else:
            log.warning("Decisión desconocida: %s", d)
