"""Genera trazos de lectura (no cartografía para medir distancias) desde INEGI:
geo/mgem/14, geo/mgee en https://gaia.inegi.org.mx/wscatgeo/v2/.
Uso: python3 scripts/cartografia.py municipios.json entidades.json > lib/mapas.json
"""
import json
import math
import sys


def simplificar(p, tol):
    a, b = p[0], p[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]
    mayor, indice = 0, 0
    for i, (x, y) in enumerate(p[1:-1], 1):
        t = max(0, min(1, ((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy or 1)))
        d = (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2
        if d > mayor:
            mayor, indice = d, i
    if mayor <= tol*tol:
        return [a, b]
    return simplificar(p[:indice+1], tol)[:-1]+simplificar(p[indice:], tol)


def mapa(path):
    fs = json.load(open(path))["features"]
    pol = {}
    for f in fs:
        g = f["geometry"]
        rings = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        pol[f["properties"]["cvegeo"]] = [ring[0] for ring in rings]
    pts = [p for rings in pol.values() for ring in rings for p in ring]
    xmin, xmax = min(x for x, y in pts), max(x for x, y in pts)
    ymin, ymax = min(y for x, y in pts), max(y for x, y in pts)
    c = math.cos(math.radians((ymax+ymin)/2))
    scale = min(570/((xmax-xmin)*c), 345/(ymax-ymin))
    def xy(p):
        return [round(300+(p[0]-(xmin+xmax)/2)*scale*c, 1), round(185-(p[1]-(ymin+ymax)/2)*scale, 1)]
    out = []
    for k, rings in pol.items():
        paths, area, center = [], 0, None
        for r in rings:
            pts = [xy(p) for p in simplificar(r, .8/scale)]
            crosses = [(a[0]*b[1]-b[0]*a[1]) for a,b in zip(pts,pts[1:])]
            s = sum(crosses)
            if abs(s)<1:
                continue
            paths.append("M"+" ".join(f"{x:g},{y:g}" for x,y in pts[:-1])+"Z")
            if abs(s)>area:
                area = abs(s)
                center = [round(sum((a[j]+b[j])*v for a,b,v in zip(pts,pts[1:],crosses))/(3*s),1) for j in range(2)]
        out.append(dict(k=k,d="".join(paths),xy=center or xy(rings[0][0])))
    return out


print(json.dumps([mapa(p) for p in sys.argv[1:]], separators=(",", ":")))
