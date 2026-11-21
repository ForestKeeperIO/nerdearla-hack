import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
import valkey

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
