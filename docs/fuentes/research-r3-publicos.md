# R3: Datos públicos para EIRA Movimiento Rosa (Jalisco). Fecha: 2026-11-21

Carpeta de descargas: publicos/
Llave de unión en todo: `cvegeo` = clave INEGI de 5 dígitos (texto, "14" + municipio de 3 dígitos; Zapotlán el Grande = 14023).

## Datasets verificados por descarga

| # | Dataset | URL | HTTP / tamaño | Primera línea de cabecera / columnas clave | Local |
|---|---|---|---|---|---|
| A | INEGI Censo 2020 ITER Jalisco (CSV) | https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_14_cpv2020_csv.zip | 200, zip 1,917,703 B; CSV 8,013,612 B, 286 columnas, UTF-8 con BOM | `ENTIDAD,NOM_ENT,MUN,NOM_MUN,LOC,NOM_LOC,LONGITUD,LATITUD,ALTITUD,POBTOT,POBFEM,POBMAS,...` Quinquenios por sexo: `P_25A29_F ... P_60A64_F`, `P_65A69_F`; `P_15A49_F`, `P_18YMAS_F`, `P_60YMAS_F`, `P3YM_HLI` (habla lengua indígena), `PHOG_IND` (en hogares indígenas). Fila municipal = `LOC=='0000'` y `MUN!='000'` (125 filas). Clave = ENTIDAD+MUN | publicos/iter14.zip, publicos/iter/ |
| A' | Derivado: tabla de denominadores 125 municipios | (generado desde A) | 7,578 B | `cvegeo,nom_mun,pobtot,pobfem,mujeres_25_64,mujeres_40_69,p3ym_hli,phog_ind,pob_loc_menor_2500,pct_rural`. Zapotlán: pobtot 115141, pobfem 58953, mujeres 25-64 = 30089, mujeres 40-69 = 18477, HLI 862, rural 2.7% | publicos/jalisco_mun_denominadores_2020.csv |
| B | CONAPO Índice de marginación municipal 2020 (XLSX) | https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Municipio/IMM_2020.xlsx | 200, 1,065,622 B | Hoja `IMM_2020`: `CVE_ENT,NOM_ENT,CVE_MUN,NOM_MUN,POB_TOT,ANALF,SBASC,OVSDE,OVSEE,OVSAE,OVPT,VHAC,PL.5000,PO2SM,IM_2020,GM_2020,IMN_2020`. CVE_MUN ya es de 5 dígitos. Zapotlán: GM_2020 = "Muy bajo", IM 59.94 | publicos/IMM_2020.xlsx |
| C | CONEVAL Pobreza municipal 2010-2020 (ZIP con XLSX) | https://www.coneval.org.mx/Medicion/Documents/Pobreza_municipal/2020/Concentrado_indicadores_de_pobreza_2020.zip | 200, 4,401,534 B (xlsx 5,017,971 B) | Hojas `Concentrado municipal`, `Concentrado estatal`. Cabecera en filas 4-5 (combinada): `Clave de entidad, Entidad federativa, Clave de municipio, Municipio, Población 2010/2015/2020, Pobreza (Porcentaje/Personas/Carencias promedio x 2010/2015/2020), Pobreza extrema, ..., Carencia por acceso a los servicios de salud, ...`. Requiere aplanar cabecera | publicos/coneval/Concentrado_indicadores_de_pobreza_2020.xlsx |
| D | INEGI Defunciones registradas 2024 (microdatos CSV) | https://www.inegi.org.mx/contenidos/programas/edr/datosabiertos/defunciones/2024/conjunto_de_datos_edr2024_csv.zip | 200, 31,045,816 B (CSV interno 240 MB, latin-1) | `ent_regis,mun_regis,...,ent_resid,mun_resid,...,causa_def,cod_adicio,lista_mex,sexo,...,edad,...,area_ur,edad_agru,...`. Filtro: ent_resid=14, sexo=2, causa_def C50* (mama) / C53* (cuello uterino) | publicos/edr2024.zip |
| D' | Derivado: muertes por cáncer de mama y cervicouterino, mujeres residentes en Jalisco, 2024, por municipio | (generado desde D) | 1,816 B, 135 filas | `cvegeo,causa_cie10,defunciones_mujeres_2024`. Jalisco total: C50=646, C53=254. Zapotlán: C50=10, C53=6 | publicos/jalisco_def_c50_c53_2024.csv |
| E | INEGI Catálogo Único (web service JSON, sin token), municipios de Jalisco | https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14 | 200, 24,311 B, application/json | `{"datos":[{"cvegeo":"14001","cve_ent":"14","cve_mun":"001","nomgeo":"Acatic","cve_cab":"0001","pob_total":...,"pob_femenina":...,"pob_masculina":...,"total_viviendas_habitadas":...}]}`, numReg 125 | publicos/mgem14.json |

Notas: el ITER suprime con `*` algunos valores en localidades pequeñas (no en la fila municipal). `pct_rural` = población en localidades < 2,500 hab / POBTOT (definición INEGI de rural). Mortalidad por municipio con 1 año da números pequeños: usar promedio 3-5 años o reportar a nivel estatal/regional.

## Lista de fuentes (URL, idea clave, estado)

1. https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_14_cpv2020_csv.zip . ITER 2020 Jalisco, mujeres por quinquenio de edad por municipio. VERIFICADO POR DESCARGA (200, 1.9 MB).
2. https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Municipio/IMM_2020.xlsx . Índice y grado de marginación municipal 2020. VERIFICADO POR DESCARGA (200, 1.07 MB).
3. https://www.gob.mx/conapo/documentos/indices-de-marginacion-2020-284372 . Página oficial que enlaza IMM_2020.xlsx y el script de cálculo (.rar). Página leída (WebFetch).
4. https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Entidad_Federativa/Indice_de_marginacion_2020_Script.rar . Programa de cálculo del índice. NO VERIFICADO.
5. https://www.coneval.org.mx/Medicion/Documents/Pobreza_municipal/2020/Concentrado_indicadores_de_pobreza_2020.zip . Pobreza y carencias por municipio 2010/2015/2020 (incluye carencia de acceso a salud). VERIFICADO POR DESCARGA (200, 4.4 MB).
6. https://WWW.CONEVAL.ORG.MX/Medicion/Documents/Pobreza_municipal/2020/Metodologia_pobreza_municipal_2020.pdf . Metodología municipal 2020 (mismos umbrales que 2010/2015). NO VERIFICADO (solo buscador).
7. https://WWW.CONEVAL.ORG.MX/Medicion/Documents/Pobreza_municipal/2020/Manual_usuario_MunEBPH_2020.pdf . Manual de bases y programas de cálculo. NO VERIFICADO.
8. https://www.coneval.org.mx/SalaPrensa/Comunicadosprensa/Documents/2021/COMUNICADO_016_MEDICION_POBREZA_MUNICIPAL_2020.pdf . Comunicado oficial de la medición municipal 2020. NO VERIFICADO.
9. https://www.coneval.org.mx:443/Medicion/Documents/Pobreza_municipal/2020/gpos_pob/Sintesis_pobreza_rururb_municipal.pdf . Pobreza municipal rural/urbana (útil para Comunidades de Origen). NO VERIFICADO.
10. https://www.coneval.org.mx/Medicion/Documents/Pobreza_municipal/2020/gpos_pob/Metodologia_pobreza_grupos_municipal.pdf . Pobreza municipal por grupos (incluye indígena). NO VERIFICADO.
11. https://www.inegi.org.mx/contenidos/programas/edr/datosabiertos/defunciones/2024/conjunto_de_datos_edr2024_csv.zip . Microdatos de defunciones 2024 con municipio de residencia y CIE-10. VERIFICADO POR DESCARGA (200, 31.0 MB).
12. https://www.inegi.org.mx/contenidos/programas/edr/datosabiertos/defunciones/2023/conjunto_de_datos_edr2023_csv.zip . Ruta análoga 2023: devolvió HTML (200, 2,263 B), NO es el zip. NO VERIFICADO (ruta distinta para 2023).
13. https://www.inegi.org.mx/sistemas/olap/Proyectos/bd/continuas/mortalidad/MortalidadGeneral.asp . Consulta interactiva (cubo) de mortalidad INEGI. NO VERIFICADO.
14. https://inegi.org.mx/contenidos/saladeprensa/boletines/2024/EDR/EDR2023_Dtivas.pdf . Cifras definitivas defunciones 2023 (799,869). NO VERIFICADO.
15. https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/edr/EDR2024-def_CP.pdf . Comunicado defunciones 2024 definitivas. NO VERIFICADO.
16. https://riisp.insp.mx/nada/index.php/catalog/21/pdf-documentation . INSP: serie compilada de mortalidad 1990-2024. NO VERIFICADO.
17. http://www.dgis.salud.gob.mx/contenidos/basesdedatos/da_defunciones_gobmx.html . DGIS datos abiertos de defunciones (página responde 200, 35 KB HTML; no se descargó base). NO VERIFICADO.
18. https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14 . Catálogo de 125 municipios de Jalisco en JSON con cvegeo, sin token. VERIFICADO POR DESCARGA (200, 24 KB).
19. https://www.inegi.org.mx/servicios/catalogoUnico.html . Documentación del servicio web del Catálogo Único (endpoints mgee/mgem). NO VERIFICADO (solo buscador).
20. https://www.inegi.org.mx/app/ageeml/ . Consulta AGEEML (catálogo de claves). NO VERIFICADO.
21. https://inegi.org.mx/servicios/api_indicadores.html . API Banco de Indicadores: requiere token gratuito (va en la ruta); áreas 00/99/999. NO VERIFICADO (no se pidió token).
22. https://pypi.org/project/pyinegi/ . Cliente Python de la API de indicadores; token en variable de entorno. NO VERIFICADO.
23. https://rdrr.io/github/diegovalle/mxmaps/f/vignettes/articles/inegi_api.Rmd . Ejemplo de uso de la API INEGI con token (R). NO VERIFICADO.
24. https://www.datos.gob.mx/dataset/proyecciones-de-poblacion . CONAPO en datos.gob.mx: indicadores demográficos municipales 1990-2040 (CSV). NO VERIFICADO (no se encontró URL directa del CSV municipal a tiempo).
25. https://www.gob.mx/conapo/documentos/proyecciones-de-la-poblacion-de-los-municipios-de-mexico-2015-2030 . Página de proyecciones municipales 2015-2030: devolvió 404. NO VERIFICADO.
26. https://chihuahua.gob.mx/sites/default/atach2/html-generico/adjuntos/2024-07/PRESENTACIO%CC%81N%20COESPO%20DMP%202024.pdf . Confirma que CONAPO tiene base municipal 1990-2020 y proyecciones 2021-2040 (2,475 municipios). NO VERIFICADO.
27. https://iieg.gob.mx/ns/wp-content/uploads/2021/06/ResultadosMarginaci%C3%B3n2020-1.pdf . IIEG Jalisco: resultados de marginación 2020 para Jalisco. NO VERIFICADO.
28. https://iieg.gob.mx/ns/wp-content/uploads/2024/04/Revista_art.-3.pdf . IIEG: advierte que indicadores.sej.gob.mx no siempre está disponible. NO VERIFICADO.
29. https://mide.jalisco.gob.mx/mide/reporte/ficha_indicador/1630 . MIDE Jalisco: indicadores educativos desagregables por municipio. NO VERIFICADO.
30. https://planeacion.sep.gob.mx/Doc/estadistica_e_indicadores/EstIndEntFed2024/14_JAL.pdf . SEP: estadística e indicadores educativos de Jalisco 2024 (PDF, no archivo municipal directo). NO VERIFICADO.
31. https://www.planeacion.sep.gob.mx/Doc/Atlas_estados/jalisco.pdf . Atlas educativo Jalisco con datos 911 municipales (PDF). NO VERIFICADO.
32. https://ensanut.insp.mx/encuestas/ensanut2012/doctos/analiticos/RetosCancerMujer.pdf . ENSANUT 2012: cobertura de Papanicolaou y mastografía por quintil. NO VERIFICADO.
33. https://sgg.jalisco.gob.mx/sites/sgg.jalisco.gob.mx/files/coepopdfnota201404salud.pdf . COEPO Jalisco: Papanicolaou y exploración de mama en Jalisco (ENSANUT 2012; 33.8% exploración clínica). NO VERIFICADO.
34. https://www.medigraphic.com/pdfs/salpubmex/sal-2025/sal252d.pdf . Salud Pública Mex 2025: cobertura de mastografía por entidad, ENSANUT. NO VERIFICADO.
35. https://who.int/publications/i/item/9789240014107 . OMS, Estrategia global de eliminación del cáncer cervicouterino: 90-70-90 a 2030, umbral < 4 por 100,000 mujeres-año. NO VERIFICADO (buscador).
36. https://www.paho.org/en/end-cervical-cancer/cervical-cancer-elimination-dashboard/cervical-cancer-elimination-targets . OPS: tablero y metas 90-70-90. NO VERIFICADO.
37. https://www.who.int/news/item/19-08-2020-world-health-assembly-adopts-global-strategy-to-accelerate-cervical-cancer-elimination . Adopción por la Asamblea Mundial de la Salud (2020). NO VERIFICADO.
38. https://irisdev.thegiin.org/metric/5.3/PI4060 . IRIS+ PI4060 Client Individuals: Total = "Number of unique individuals who were clients ... during the reporting period"; en salud = pacientes. Página leída (WebFetch).
39. https://irisdev.thegiin.org/metric/5.3/pi3902 . IRIS+ PI3902 Healthcare Crude Coverage: % de pacientes que recibieron la intervención necesaria. NO VERIFICADO (buscador; la cita de la página menciona PI1568, revisar).
40. https://irisdev.thegiin.org/metric/5.3/pi5060 . IRIS+ PI5060 Patients Completing Treatment. NO VERIFICADO.
41. https://irisdev.thegiin.org/metric/5.3/PI2998 . IRIS+ PI2998 Individuals Trained: Total (programas educativos). NO VERIFICADO.
42. https://irisdev.thegiin.org/metric/5.3/pi9622 . IRIS+ PI9622 Client Individuals: Receiving Free Products/Services. NO VERIFICADO.
43. https://s3.amazonaws.com/giin-web-assets/giin/assets/publication/research/iris-data-brief-focus-on-beneficiaries.pdf . GIIN: PI4060 mide escala ("how much"), no "quién". NO VERIFICADO.
44. https://www.measureevaluation.org/resources/publications/sr-09-60.html . MEASURE Evaluation: tres tipos de doble conteo (mismo beneficiario por mismo socio, mismo beneficiario por varios socios, mismo sitio). NO VERIFICADO.
45. https://indicatorregistry.unaids.org/indicator/kpprev-number-key-populations-reached-individual-andor-small-group-level-hiv-prevention . PEPFAR MER KP_PREV: contar individuos deduplicados por periodo; quien recibe varios servicios cuenta una vez. NO VERIFICADO.
46. https://indicatorregistry.unaids.org/indicator/ppprev-number-priority-populations-pp-reached-standardized-evidence-based-interventions . PEPFAR PP_PREV: deduplicación anual con identificador único. NO VERIFICADO.
47. https://www.measureevaluation.org/measure/community-based-indicators/indicators . MEASURE: contar personas atendidas, no pruebas administradas. NO VERIFICADO.
48. https://docs.dhis2.org/en/topics/training-docs/tracker-use-academy/tracker-data-model/tracker-data-model-session-summary.html . DHIS2: Tracked Entity Instance = persona única; eventos = atenciones. NO VERIFICADO.
49. https://docs.dhis2.org/en/use/user-guides/dhis-core-version-243/analysing-data/event-reports.html . DHIS2: salida por "Tracked entity instance" cuenta personas únicas vs "Event" cuenta servicios. NO VERIFICADO.
50. https://docs.dhis2.org/pt/implement/maintenance-and-use/tracker-and-aggregate-data-integration.html . DHIS2: agregación de tracker vía program indicators. NO VERIFICADO.
51. https://unstats.un.org/sdgs/metadata/?Goal=3 . Repositorio de metadatos ODS 3 (3.4.1 mortalidad por ENT incl. cáncer, 30-70 años; 3.7.1 planificación familiar). NO VERIFICADO (los extractos no mostraron 3.4.1/3.7.1).
52. https://sdgindicators.nso.gov.mt/3-4-1/ . Título oficial 3.4.1: mortalidad atribuida a ECV, cáncer, diabetes o respiratoria crónica. NO VERIFICADO.

Total: 52 fuentes devueltas por herramientas; 7 recursos verificados por descarga (A, B, C, D, E + 2 derivados).

## No verificado / pendiente
- Proyecciones CONAPO municipales por sexo y edad (2015-2030 o 1990-2040): página 2015-2030 da 404; datos.gob.mx no revisado a fondo. Usar Censo 2020 (A) como denominador.
- ENSANUT 2022/2023 cobertura de tamizaje por entidad: no se halló tabla descargable; solo PDFs/artículos.
- API Banco de Indicadores INEGI: requiere token, no probada.
- Matrícula escolar por municipio (Formato 911): sin archivo directo encontrado.
- Globocan y cubos DGIS: no revisados por tiempo.
- IRIS+: no existe métrica específica de "individuos tamizados"; usar PI4060 con desagregación + definición propia.
