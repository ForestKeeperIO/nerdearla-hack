"""Convierte el Marco Geoestadistico de INEGI en trazos para el tablero.

Uso: python3 geometria-atlas.py archivo.geojson atlas/14.json
Fuente: https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14 (mgee para Mexico).
No contiene ni calcula estadisticas de personas.
"""
import json
import math
import sys
from pathlib import Path


def simplificar(points, epsilon=0.48):
    if len(points) < 3:
        return points
    (x, y), (b, c) = points[0], points[-1]
    dx, dy = b - x, c - y
    d, index = 0, 0
    for i, (xx, yy) in enumerate(points[1:-1], 1):
        t = min(1, max(0, ((xx-x)*dx + (yy-y)*dy) / (dx*dx + dy*dy or 1)))
        dist = (xx-x-t*dx)**2 + (yy-y-t*dy)**2
        if dist > d:
            d, index = dist, i
    if d <= epsilon**2:
        return [points[0], points[-1]]
    return simplificar(points[:index+1])[:-1] + simplificar(points[index:])


def atlas(geo):
    shapes = {}
    for f in geo["features"]:
        g = f["geometry"]
        polygons = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        shapes[f["properties"]["cvegeo"]] = [ring for poly in polygons for ring in poly]
    points = [p for rings in shapes.values() for ring in rings for p in ring]
    west, south = map(min, zip(*points))
    east, north = map(max, zip(*points))
    k = math.cos(math.radians((north+south)/2))
    scale = 600 / max((east-west)*k, north-south)
    paths = {}
    for key, rings in shapes.items():
        lines = []
        for ring in rings:
            pts = simplificar([((x-west)*k*scale, (north-y)*scale) for x,y in ring])
            if len(pts) >= 4:
                lines.append("M" + " ".join(f"{x:.1f},{y:.1f}" for x,y in pts[:-1]) + "Z")
        paths[key] = "".join(lines)
    return {"vista": f"-4 -4 {math.ceil((east-west)*k*scale)+8} {math.ceil((north-south)*scale)+8}", "trazos": paths}


if __name__ == "__main__":
    Path(sys.argv[2]).write_text(json.dumps(atlas(json.loads(Path(sys.argv[1]).read_text())), separators=(",", ":"))+"\n")
