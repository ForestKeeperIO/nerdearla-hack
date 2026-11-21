<<<<<<< HEAD
"""Pruebas del motor contra Valkey 6391 base 15 y SQLite temporal."""
import os
=======
import os
import shutil
import socket
>>>>>>> Procesamiento en Python: leer, deduplicar y escribir en Valkey
import subprocess
import sys
import time
from pathlib import Path

import pytest
import valkey

<<<<<<< HEAD
REPO = Path(__file__).resolve().parents[2]
# El modulo 'py' de site-packages sombrea nuestro paquete py/; lo sacamos del
# cache y el repo va primero en sys.path.
_mod = sys.modules.get("py")
if _mod is not None and not hasattr(_mod, "__path__"):
    del sys.modules["py"]
sys.path.insert(0, str(REPO))
REPORTES = REPO / "reportes"
URL_TEST = "redis://127.0.0.1:6391/15"

# archivo -> (programa=id de iniciativa, unidad, fecha_corte)
TRABAJOS = {
    "tamizaje-rosa.xlsx": ("tamizaje-rosa", "atencion", "2026-09-30"),
    "melenas-en-movimiento.xlsx": ("melenas-en-movimiento", "segun_fila", "2026-09-30"),
    "nutricion.xlsx": ("comunidades-de-origen", "atencion", "2026-08-31"),
    "reporte_final_2.xlsx": ("tamizaje-rosa", "atencion", "2026-09-30"),
    "tamizaje-rosa-reguardado.xlsx": ("tamizaje-rosa", "atencion", "2026-09-30"),
    "tamizaje-rosa.csv": ("tamizaje-rosa", "atencion", "2026-09-30"),
    "tamizaje-rosa_v2.xlsx": ("tamizaje-rosa", "atencion", "2026-10-31"),
    "agregado_publico.csv": ("salud-publica-jalisco", "registro_publico", "2026-09-30"),
}


@pytest.fixture(scope="session", autouse=True)
def entorno():
    os.environ["VALKEY_URL"] = URL_TEST
    os.environ["IMPACTO_HMAC_KEY"] = "eira-pruebas"
    try:
        valkey.Valkey.from_url(URL_TEST).ping()
    except Exception:
        subprocess.run(["npm", "run", "valkey"], cwd=REPO, check=True,
                       env={**os.environ, "VALKEY_PORT": "6391"},
                       capture_output=True)
        for _ in range(60):
            try:
                valkey.Valkey.from_url(URL_TEST).ping()
                break
            except Exception:
                time.sleep(0.5)
    yield


class Motor:
    def __init__(self, v, vb, db):
        self.v, self.vb, self.db = v, vb, db

    def procesar(self, nombre, programa=None, unidad=None, fecha_corte=None,
                 estado_clave="14"):
        from py.motor import worker
        programa, unidad, fecha_corte = (
            programa or TRABAJOS[nombre][0], unidad or TRABAJOS[nombre][1],
            fecha_corte or TRABAJOS[nombre][2])
        tid = worker.encolar(self.v, (REPORTES / nombre).read_bytes(), nombre,
                             programa, unidad, fecha_corte, por="pruebas",
                             estado_clave=estado_clave)
        worker.procesar_trabajo(self.v, self.db, tid, vb=self.vb)
        return self.v.hgetall(f"eira:trabajo:{tid}")

    def sql(self, q, *args):
        return self.db.execute(q, args).fetchone()[0]

    def decidir(self, tipo, **campos):
        from py.motor import worker
        worker.aplicar_decision(self.v, self.db, {"tipo": tipo, "por": "pruebas",
                                                  **campos})


@pytest.fixture
def motor(tmp_path):
    from db.crear import crear
    from py.motor import worker
    v = worker.conectar()
    vb = worker.conectar(texto=False)
    v.flushdb()
    db = crear(str(tmp_path / "impacto.sqlite"))
    yield Motor(v, vb, db)
    db.close()
    v.close()
    vb.close()
=======
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "datos_demo"))


def _puerto():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture
def v(tmp_path):
    exe = shutil.which("valkey-server") or shutil.which("redis-server")
    if not exe:
        pytest.skip("No hay valkey-server ni redis-server en el PATH")
    puerto = _puerto()
    p = subprocess.Popen([exe, "--port", str(puerto), "--bind", "127.0.0.1", "--save", "", "--dir", str(tmp_path)],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    cli = valkey.Valkey(port=puerto, decode_responses=False)
    for _ in range(50):
        try:
            cli.ping()
            break
        except Exception:
            time.sleep(0.1)
    yield cli
    p.terminate()
    p.wait()


@pytest.fixture
def proc(v, tmp_path):
    from procesador.estado import abrir
    from procesador.trabajos import Procesador
    return Procesador(v, abrir(tmp_path / "t.sqlite"), b"llave-de-prueba")


@pytest.fixture(scope="session")
def archivos():
    import generar
    esperado = generar.generar()
    return generar.SALIDA, esperado
>>>>>>> Procesamiento en Python: leer, deduplicar y escribir en Valkey
