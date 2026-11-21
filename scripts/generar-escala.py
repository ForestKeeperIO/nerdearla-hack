"""Escribe los cuatro XLSX ficticios y su oráculo en un directorio vacío."""
import datetime as dt
import json
import random
import sys
from pathlib import Path

from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py/datos_demo"))
from generar import APELLIDOS, CIUDADES, ENCAB_T, NOMBRES, SERV_TAMIZAJE, edad, sin


def generar(destino):
    if not destino.is_dir() or any(destino.iterdir()):
        raise SystemExit("Indica un directorio vacío existente.")
    rng = random.Random(20261121)
    personas, ids, manifiesto = [], set(), []
    for indice, n in enumerate((1000, 5000, 10000, 50000)):
        duplicadas = n // 100
        comunes = n // 20 if indice else 0
        nuevas = n - duplicadas - comunes
        lote = rng.sample(personas, comunes)
        for _ in range(nuevas):
            while True:
                nom, pat, mat = rng.choice(NOMBRES), rng.choice(APELLIDOS), rng.choice(APELLIDOS)
                nac = dt.date(1950, 1, 1) + dt.timedelta(days=rng.randrange(55 * 365))
                clave = sin(pat[0] + mat[0] + nom[0]).upper() + nac.strftime("%Y%m%d")
                if clave not in ids:
                    break
            ids.add(clave)
            p = (clave, f"{nom} {pat} {mat}", nac, rng.choice(CIUDADES))
            personas.append(p)
            lote.append(p)
        filas = []
        for i, (clave, nombre, nac, ciudad) in enumerate(lote):
            if i < comunes:
                # En un quinto hay una letra distinta; el resto sólo cambia caja o tildes.
                nombre = nombre + "s" if i % 5 == 0 else sin(nombre).upper()
            fecha = dt.date(2026, 3 + 2 * indice, rng.randint(1, 28))
            filas.append([clave, nombre, nac, edad(nac), ciudad, rng.choice(SERV_TAMIZAJE), fecha, "Sí"])
        filas.extend(rng.sample(filas, duplicadas))
        rng.shuffle(filas)
        wb = Workbook(write_only=True)
        ws = wb.create_sheet("Tamizaje Rosa")
        ws.append(ENCAB_T)
        for fila in filas:
            ws.append(fila)
        ruta = destino / f"tamizaje-ficticio-{n}.xlsx"
        wb.save(ruta)
        manifiesto.append(dict(filas=n, repetidas=duplicadas, compartidas=comunes,
                               personas_acumuladas=len(ids), archivo=ruta.name, bytes=ruta.stat().st_size))
    (destino / "esperado.json").write_text(json.dumps(manifiesto, indent=2) + "\n")


if __name__ == "__main__":
    generar(Path(sys.argv[1]))
