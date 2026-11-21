"""Puerta de corte: lee el HTML, CSV y tarjeta real; no siembra ni repara datos."""
import csv
import io
import json
import os
import re
from html.parser import HTMLParser
from urllib.request import urlopen

import valkey


class Texto(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fragmentos = []
        self.oculto = False
        self.indicadores = {}
        self.indicador = None

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.oculto = True
        if tag == "b":
            self.indicador = dict(attrs).get("data-kpi")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.oculto = False
        if tag == "b":
            self.indicador = None

    def handle_data(self, dato):
        if dato.strip() and not self.oculto:
            self.fragmentos.append(dato.strip())
            if self.indicador:
                self.indicadores[self.indicador] = dato.strip()


def leer(url):
    with urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8-sig")


def main():
    v = valkey.Valkey.from_url(os.environ["VALKEY_URL"], decode_responses=True,
                               password=os.getenv("VALKEY_PASSWORD") or None, socket_timeout=5)
    app = os.environ["APP_URL"].rstrip("/")
    dashboard = os.environ["TABLERO_MB"].split("?")[0].replace("/public/dashboard/", "/api/public/dashboard/")
    met = v.hgetall("eira:met:global")
    if not met:
        raise SystemExit("Sin fuentes: comparar ceros no prueba una integración")
    p = Texto()
    p.feed(leer(app + "/tablero"))
    kpi = p.indicadores["personas"]
    csv_global = {r["indicador"]: r["valor"] for r in csv.DictReader(io.StringIO(leer(app + "/informe/global/informe.csv")))}
    informe = csv_global["personas_impactadas"]
    card = next(c for c in json.loads(leer(dashboard))["dashcards"]
                if (c.get("card") or {}).get("name") == "Personas impactadas")
    respuesta = json.loads(leer(f"{dashboard}/dashcard/{card['id']}/card/{card['card_id']}"))
    if respuesta.get("status") != "completed":
        raise SystemExit("Metabase no pudo ejecutar la tarjeta")
    mb = str(respuesta["data"]["rows"][0][0])
    esperado = met["personas"]
    print(f"Procesador={esperado}; Tablero={kpi}; Metabase={mb}; Informe CSV={informe}")
    print(f"Únicas entre programas={met['personas_unicas_en_total']}; "
          f"en varios={met['personas_en_mas_de_un_programa']}; donantes aparte={v.scard('eira:don:todas')}")
    if int(esperado) < 5:
        raise SystemExit("Usa el corpus ficticio con 5 o más para comparar cifras sin supresión")
    # El HTML usa toLocaleString('es-MX'); CSV, SQL y Valkey no agrupan millares.
    kpi_decimal = kpi.replace(",", "") if re.fullmatch(r"[0-9]{1,3}(,[0-9]{3})+", kpi) else kpi
    if not kpi_decimal == mb == informe == esperado:
        raise SystemExit("NO CORTAR: los lectores discrepan")
    municipios = v.hlen("eira:presencia:global")
    print(f"Presencia: Valkey={municipios}; mapa/tablero={p.indicadores['municipios']}; CSV={csv_global.get('presencia_municipios')}")
    if not municipios or str(municipios) != p.indicadores["municipios"] or str(municipios) != csv_global.get("presencia_municipios"):
        raise SystemExit("NO CORTAR: la presencia no concuerda")


if __name__ == "__main__":
    main()
