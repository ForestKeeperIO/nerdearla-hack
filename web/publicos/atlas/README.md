# Límites del atlas

Fuente: INEGI, Marco Geoestadístico, diciembre de 2025. `mx.json` representa las 32 entidades; `01.json` a `32.json`, sus municipios. Son contornos simplificados para pantalla, no límites para peritajes ni estimaciones de población.

La geometría se genera a partir del [servicio del Catálogo Único de Claves](https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee). Por ejemplo, desde `web/`:

```sh
curl -fsS https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14 -o jalisco.geojson
python3 scripts/geometria-atlas.py jalisco.geojson publicos/atlas/14.json
```

Las claves `cvegeo` enlazan el dibujo con los registros de la vista del motor. Un municipio sin actividad conserva su contorno sin colorear. No se hacen peticiones al servicio cartográfico desde el navegador.
