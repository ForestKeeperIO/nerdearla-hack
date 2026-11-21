# Datos públicos

Descargados el 2026-11-21. La clave de unión es la clave INEGI de 5 dígitos como texto (`14` + municipio de 3 dígitos).

| Archivo | Origen | Cómo se obtuvo |
|---|---|---|
| `jalisco_mun_denominadores_2020.csv` | INEGI, Censo de Población y Vivienda 2020, ITER Jalisco: https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_14_cpv2020_csv.zip | Filas municipales (`LOC == '0000'`); suma de grupos quinquenales de mujeres de 25 a 64 y de 40 a 69; población indígena; porcentaje en localidades de menos de 2,500 habitantes |
| `IMM_2020.xlsx` | CONAPO, Índice de marginación por municipio 2020: https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Municipio/IMM_2020.xlsx | Sin cambios |
| `mgem14.json` | INEGI, catálogo de municipios de Jalisco: https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14 | Sin cambios |
| `jalisco_def_c50_c53_2024.csv` | INEGI, defunciones registradas 2024: https://www.inegi.org.mx/contenidos/programas/edr/datosabiertos/defunciones/2024/conjunto_de_datos_edr2024_csv.zip | Mujeres residentes en Jalisco con causa C50 (mama) o C53 (cervicouterino), por municipio |
