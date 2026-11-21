# Impacto EIRA

Herramienta para que **Presidencia de EIRA Movimiento Rosa A.C.** deje de juntar a mano
los Excel de cada coordinación. En sus palabras: subir los archivos, aplicar filtros de
calidad, ver una vista previa y exportar el informe. La plataforma detecta el mismo
archivo aunque cambie de nombre, no cuenta dos veces la misma fila ni la misma
persona, y muestra de dónde sale cada cifra.

Reto 3 de la guía de EIRA para la Nerdearla Vibeathon by Devin (CDMX, 2026-11-21).

## Cómo se ve

| Pantalla | Captura |
|---|---|
| Portada: los tres informes | `docs/capturas/portada-vacia.png` |
| Subir archivos | `docs/capturas/subir.png` |
| Calidad | `docs/capturas/calidad.png` |
| Vista previa (Tamizaje Rosa) | `docs/capturas/vista-previa.png` |
| Vista previa (Melenas en Movimiento) | `docs/capturas/melenas-vista-previa.png` |
| Global bloqueado / Global con datos | `docs/capturas/global-bloqueado.png` / `docs/capturas/global-vista-previa.png` |
| Exportar | `docs/capturas/exportar.png` |
| Tableros de Metabase | `docs/capturas/metabase-impacto.png`, `docs/capturas/metabase-calidad.png` |

*(Capturas del frontend tal como está construido en la rama `fe`; las de Metabase,
de la rama `metabase`. La paleta de EIRA —vino y ciruela, Rosarivo y Montserrat—
está decidida y documentada en `docs/referencias/paleta-eira.md`; estas
capturas aún muestran el acento del rediseño anterior, que se va a sustituir.)*

## Cómo levantarlo

Requisitos: Node 20+, Python 3.11+ con `uv`, Java 21 (solo si se usa Metabase).

```bash
# 1. Valkey local (descarga el binario oficial 9.2 la primera vez)
npm install
VALKEY_PORT=6391 npm run valkey

# 2. Datos de demostración y comprobación del contrato
VALKEY_URL=redis://127.0.0.1:6391 npm run semilla
VALKEY_URL=redis://127.0.0.1:6391 npm run verificar
npm run limpiar   # cuando se quiera vaciar

# 3. Base de reporte SQLite y motor de procesamiento (rama motor)
uv sync
uv run python -m db.crear --con-denominadores   # escribe data/impacto.sqlite
uv run pytest                                    # 24 pruebas
# worker en primer plano y, en otra terminal, procesar un Excel sin frontend:
IMPACTO_HMAC_KEY=<clave> bash scripts/arrancar-motor.sh
uv run python scripts/procesar_local.py reportes/tamizaje-rosa.xlsx \
    --programa tamizaje-rosa --unidad atencion --fecha-corte 2026-09-30

# 4. Metabase (rama metabase)
bash metabase/arrancar.sh                        # descarga el JAR y arranca en :3200
uv run metabase/datos_prueba.py                  # SQLite ficticio de prueba
uv run --with requests metabase/provisionar.py --entorno blanco --db data/impacto.sqlite

# 5. Frontend (rama fe)
cd web && npm install
VALKEY_URL=redis://127.0.0.1:6391 npm run dev     # http://localhost:3000
```

Variables: `VALKEY_URL` (con número de base para separar entornos) y
`VALKEY_PASSWORD`; el motor pide además `IMPACTO_DB` e `IMPACTO_HMAC_KEY`.
Metabase genera su propia cuenta de administración en
`.metabase/credenciales.json` (ignorado por git); no hay otros servicios ni
credenciales.

**Los dos entornos del demo** (`scripts/demo.sh`, rama `demo`; la operación está
en [`docs/operacion-demo.md`](docs/operacion-demo.md)): `blanco` empieza vacío y
`real` trae los reportes de datos abiertos ya procesados. La incrustación de los
tableros de Metabase en el frontend está pendiente (los enlaces públicos ya
existen en `metabase/enlaces.json`).

## El recorrido

Hay un informe por programa y uno **Global**. El demo usa dos programas
deliberadamente distintos —**Tamizaje Rosa** (atenciones a pacientes) y
**Melenas en Movimiento** (donaciones de cabello y pelucas entregadas)— más el
Global, para mostrar que la misma base sirve a programas de distinta naturaleza.
En la versión con fuentes reales se agrega un tercer informe, "Datos públicos de
salud (Jalisco)". La persona de Presidencia entra al informe que va a armar y
recorre pasos que no se puede saltar:

1. **Subir.** Arrastra los `.xlsx` o `.csv` de esa coordinación; cada archivo dice
   su estado en palabras ("Listo: 120 filas", "Ya se cargó como 'rosa.xlsx'").
   El Global no tiene paso de Subir: usa lo que ya subió cada programa.
2. **Calidad.** Cada archivo recibe de 1 a 5 estrellas con lo que le falta
   ("8 filas sin ID"), los problemas por tipo y los casos de "¿es la misma
   persona?", que decide una persona, no el programa.
3. **Vista previa.** Las tres cifras que pidió EIRA primero —personas
   impactadas, edad promedio y desglose por ciudad— cada una con su nota de qué
   archivos la producen y con qué fecha de corte. En Melenas en Movimiento las
   donaciones de trenza y las entregas de peluca se muestran por separado y
   nunca se suman.
4. **Exportar.** El informe con notas al pie, para descargar en CSV o imprimir.

El informe Global está bloqueado hasta que los dos programas tengan al menos un
archivo, y lo dice ("Falta subir archivos de Melenas en Movimiento"). Su total
de personas es la **suma de las personas impactadas de cada programa**: quien
aparece en dos programas cuenta dos veces ahí, y debajo se muestra aparte —
como dato informativo, sin restarlo— cuántas se repiten. Quien dona una trenza
es donante y **no** cuenta como persona impactada; quien recibe una peluca sí.

Los programas que se muestran salen de
[`catalogos/iniciativas.json`](catalogos/iniciativas.json): no hay nombres fijos
en el código, y **agregar un programa es agregar una entrada al catálogo**.

## Cómo se omiten los duplicados

Tres capas independientes, para no contar dos veces lo mismo:

| Capa | Qué se detecta | Ejemplo |
|---|---|---|
| Archivo | Huella de los bytes; la huella de contenido se deriva de las de fila | `reporte_final_2.xlsx` es copia exacta y se rechaza; el mismo Excel vuelto a guardar, con columnas en otro orden o exportado a CSV se reconoce como `mismo_contenido`; una versión con filas nuevas solo agrega lo nuevo |
| Fila | Huella de cada fila contra todas las ya contadas | Si dos coordinaciones registran la misma jornada, las filas repetidas se omiten y quedan listadas para restituirlas si fue un error |
| Persona | Un solo identificador opaco por persona en Valkey | Quien aparece en Tamizaje Rosa y en Melenas en Movimiento aparece en los dos programas. Mismo ID con nombres distintos **no** se une ni se separa solo: queda en `eira:pares` y lo decide una persona |

Las huellas que se guardan son dos: la del archivo (sha256 de los bytes) y la de
cada fila (HMAC de la fila canónica, que no depende del orden de columnas ni del
formato). La huella de contenido se deriva de las de fila —es el resumen
ordenado de todas— y es la que reconoce el mismo archivo vuelto a guardar.

La vinculación de personas usa **reglas exactas** (mismo ID y mismo nombre
normalizado → misma persona) más **rapidfuzz** para proponer los pares dudosos
que decide una persona. Splink está instalado y es la pieza prevista para
escalar a decenas de miles de registros, pero **no es la vinculación activa del
prototipo**: con el volumen del demo la regla exacta cubre todos los casos
sembrados, y su modelo de comparación quedó sin tiempo de calibrar.

Nada de esto usa conteos aproximados: la guía de EIRA prohíbe presentar una
deduplicación estimada como cifra oficial. El diseño y los casos límite están en
[`docs/superpowers/plans/2026-11-21-impacto-eira.md`](docs/superpowers/plans/2026-11-21-impacto-eira.md)
y las revisiones de [`docs/contexto/revisiones-devin/`](docs/contexto/revisiones-devin/).

## Arquitectura

```
Excel (.xlsx / .csv) por coordinación
        │  arrastre en el navegador
        ▼
Frontend Next.js (web/) ──────────►  Valkey
  POST /api/subir                      eira:archivo:<id>   bytes, caduca en 1 h
  escribe el trabajo                   eira:trabajos       Stream, grupo "procesadores"
        ▲                              eira:trabajo:<id>   estado y mensaje para la usuaria
        │                              eira:huellas:*      memoria de duplicados
        │  PUB/SUB eira:eventos        eira:per:*          conjuntos de personas (SCARD/SINTERCARD)
        │                              eira:cnt:*          conteos por dimensión
        │                              eira:pares          casos que decide una persona
        │                              eira:informe:*      avance del recorrido por informe
        │                                  ▲
        │                                  │ XREADGROUP
        │                           Motor Python
        │                           lee el Excel, dos huellas guardadas
        │                           (archivo y fila) omiten duplicados,
        │                           reglas + rapidfuzz proponen pares
        │                                  │ escribe en una transacción
        ▼                                  ▼
Metabase ◄────────── SQLite data/impacto.sqlite (base de reporte)
(servicio aparte)         vistas v_* que leen los tableros
```

**Qué hace Valkey exactamente:** es la cola de trabajos (Stream con grupo de
consumidores), la guarda temporal del archivo subido, la memoria de duplicados
(dos huellas guardadas: archivo y fila), los conjuntos de personas que permiten
contar únicas y hacer cruces con `SCARD`/`SINTERCARD`, el estado en vivo de cada
trabajo, el avance del recorrido por informe y el canal de avisos. No es un
caché: el frontend y el motor **solo** se comunican por estas claves
([`docs/contrato-valkey.md`](docs/contrato-valkey.md)). Las claves
`eira:huellas:{archivo,contenido,fila}` (motor) y `eira:informe:<alcance>`
(frontend) ya las usa el código y falta asentarlas en el contrato;
`eira:presencia:<alcance>` está propuesta en `docs/base-de-datos.md` y aún no
la escribe el motor.

**Si se pierde Valkey:** se pierden la cola, las huellas de duplicados y el estado
en vivo. Los resultados consolidados están en SQLite y sobreviven; se puede
reconstruir reimportando, pero un archivo en tránsito podría procesarse dos veces
y habría que revisar. Para un piloto: persistencia AOF y respaldo junto con el
SQLite.

## Modelo de datos

El esquema completo (tablas, vistas y reglas) está en
[`docs/base-de-datos.md`](docs/base-de-datos.md); los programas e iniciativas en
[`catalogos/iniciativas.json`](catalogos/iniciativas.json). Tres decisiones
importan:

- **Todo es catálogo:** la base modela `iniciativas`, `tipos_de_registro` y
  `roles_de_persona` como catálogos, no como listas fijas en el código. Ese es
  el argumento de escalabilidad: agregar un programa —o un tipo de registro
  nuevo, como "donación recibida"— es agregar una entrada al catálogo.
- **No toda persona en la base es "persona impactada":** el catálogo distingue
  roles (`beneficiaria`, `participante`, `donante`, `voluntaria`) y las vistas
  de personas solo cuentan los dos primeros; donantes y voluntarias se reportan
  aparte. Si se contaran igual, la cifra saldría inflada.
- **Trazabilidad territorial:** cada registro guarda estado y municipio con las
  claves oficiales de INEGI (catálogo nacional completo: 2,478 municipios en 32
  entidades, en `publicos/municipios_mexico.json`) y se muestra como
  **presencia** —"Presencia en N municipios de M estados"— nunca como faltante
  ni como porcentaje de cobertura. Las vistas `v_presencia` y
  `v_presencia_municipios` ya están en el esquema; el bloque visual del
  frontend está pendiente.

## Implementado / Simulado / Para piloto

| Pieza | Estado |
|---|---|
| Valkey local, semilla de demostración, verificador del contrato (`npm run valkey/semilla/verificar`) | **Implementado** en `main`/`valkey-base`; `verificar` reporta 9 comprobaciones OK |
| Esquema SQLite de reporte con vistas, denominadores INEGI y catálogos de iniciativas, tipos de registro, roles y municipios (`db/`) | **Implementado** en rama `motor` (`db/esquema.sql`); sus pruebas corren dentro de las 24 del motor |
| Frontend: recorrido guiado por informe (Tamizaje Rosa, Melenas en Movimiento y Global), subida de Excel a Valkey, calidad con estrellas, vista previa y exportar CSV (`web/`) | **Implementado** en rama `fe`: los programas salen del catálogo, el Global suma programas y muestra las repetidas aparte. Ejercitado con la semilla de desarrollo (capturas en `docs/capturas/`); falta correrlo punta a punta con el motor en un entorno |
| Catálogo de iniciativas y tipos de registro | **Implementado** (`catalogos/iniciativas.json`); una iniciativa marcada `por_confirmar` |
| Reportes con datos públicos reales de Jalisco (`reportes-reales/`) | **Implementado** en rama `fuentes-reales` (4 CSV con fuente y fecha) |
| Motor Python: leer Excel/CSV, huellas de archivo y fila, personas con reglas exactas + rapidfuzz, escribir Valkey + SQLite (`py/`) | **Implementado** en rama `motor`: 24 pruebas en verde y los 7 archivos del caso verificados con sus mensajes exactos (tabla en `NOTAS.md`). Splink quedó instalado como respaldo, no es la vinculación activa |
| Detección de "el mismo archivo con otro nombre" y "la misma persona" | **Implementado** en el motor y verificado en local (niveles: idéntico, mismo contenido, versión nueva, traslape parcial, distinto); falta ejercitarla extremo a extremo desde el frontend |
| Reportes de prueba del caso de la guía (7 archivos: 120 atenciones, 80 participaciones, traslapes y versiones) | **Implementado** en rama `motor` (`reportes/` + `esperado.json`); sus pruebas en verde |
| Tableros de Metabase (Impacto y Calidad, con enlaces públicos e iframe verificado) | **Implementado** en rama `metabase` sobre un esquema provisional con datos ficticios; falta apuntarlo al esquema de `db/` e incrustarlo en el frontend |
| Trazabilidad territorial por estado y municipio INEGI | **Implementado** en el esquema (`v_presencia`, `v_presencia_municipios`, catálogo de 2,478 municipios); el bloque visual de "presencia" del frontend está **pendiente** y la clave `eira:presencia:*` solo está propuesta |
| Paleta de EIRA (vino/ciruela, Rosarivo + Montserrat) | **Decidida y documentada** en `docs/referencias/paleta-eira.md`; **pendiente de aplicar** al frontend (aún trae el acento del rediseño anterior) |
| Cuentas, contraseñas y permisos por rol | **Simulado**: el prototipo no tiene; es requisito de piloto |
| Dos versiones en línea (en blanco y con fuentes reales) | **Por verificar al integrar**: los scripts de operación existen (`scripts/demo.sh`, `docs/operacion-demo.md`, rama `demo`) y los datos reales están; al cierre de esta nota aún falta levantar ambas con el frontend actual y procesar las reales |
| URL pública estable | **Por verificar al integrar**: hubo un túnel temporal de una versión anterior |
| Autenticación, respaldo automático, HTTPS gestionado, aviso de privacidad | **Para piloto**: requisitos de la guía de EIRA y de la ley mexicana de datos personales |

## Privacidad y seguridad (con sus límites reales)

- **Seudonimizado:** en Valkey y en SQLite no se guardan nombres completos,
  teléfonos ni el ID de EIRA en claro. La persona se identifica con un valor
  opaco; las etiquetas de los pares usan solo iniciales, ciudad y edad.
- **El ID de EIRA tiene poca entropía** (tres iniciales + fecha de nacimiento):
  es predecible y puede repetirse entre dos personas. Se respeta porque es el
  que usan hoy, pero no sirve como secreto ni como identificador único
  garantizado; por eso los casos dudosos los decide una persona.
- **Sin cuentas ni contraseñas:** el prototipo corre en local o en una URL
  temporal; cualquiera con la dirección puede subir archivos. Es un límite
  declarado, no una omisión.
- **Datos de salud:** los registros de EIRA son datos personales sensibles bajo
  la Ley de Protección de Datos Personales en Posesión de los Particulares de
  2025. Un piloto requiere aviso de privacidad, base de tratamiento, medidas de
  seguridad y control de accesos. **No se afirma cumplimiento:** el prototipo
  usa solo datos ficticios.
- **Tableros sin datos personales:** Metabase lee solo vistas agregadas
  (`v_*`), no tablas con datos de persona.

## Operación

- **Quién la administra:** hoy, el equipo del hackathon. En piloto, una persona
  técnica externa o voluntaria con una guía de una página; la usuaria de
  Presidencia no administra nada.
- **Respaldo:** copiar `data/*.sqlite` y la persistencia de Valkey (AOF). El
  respaldo contiene identificadores seudonimizados: se guarda con el mismo
  cuidado que los datos.
- **Si falla:** el recorrido vuelve a abrir los pasos por revisar. En el motor,
  las huellas se registran al final de la transacción de Valkey y
  `fuentes.huella_bytes` es única: una caída a media carga no marca el archivo y
  un reintento se reporta como idéntico en vez de reimportar (implementado;
  probado en las pruebas, no en una caída real). Los errores se ven en la
  pantalla del paso correspondiente y en la bitácora `eira:bitacora`.

## Costos mensuales estimados

Estimación para un piloto, no una cotización:

| Escenario | Costo |
|---|---|
| En la laptop de Presidencia (como el prototipo) | 0 USD |
| Una instancia pequeña (frontend + Valkey + SQLite + Metabase en el mismo equipo) | ~5–12 USD/mes (VPS básico o nivel gratuito con límites) |

Sin licencias de software: todo el stack es de código abierto. El costo real lo
manda el respaldo y el monitoreo, no el cómputo.

## Licencias de terceros

Nuestro código es **MIT** ([`LICENSE`](LICENSE)). Las dependencias principales:

| Componente | Licencia | Nota |
|---|---|---|
| Valkey | BSD-3 | Se usa el binario oficial y el cliente `iovalkey` (MIT) |
| pandas, openpyxl, RapidFuzz, valkey | BSD / MIT / Apache-2.0 | Motor de procesamiento (rama `motor`) |
| Splink | MIT | Instalado como respaldo para escalar la vinculación; no activo en el prototipo |
| DuckDB | MIT | Motor interno de Splink (ibidem) |
| SQLite | Dominio público | Base de reporte |
| Next.js, React, iovalkey, Radix, TanStack, sonner | MIT / ISC / Apache-2.0 | Detalle por paquete en `web/package.json` (rama `fe`) |
| Metabase | **AGPL** | Se ejecuta como servicio aparte; no se copia código suyo al repositorio |
| Componentes de interfaz | Ver tabla completa | [`web/TERCEROS.md`](web/TERCEROS.md) en la rama `fe`: qué se copió (solo MIT), qué se reimplementó y por qué |
| Tipografías Inter e IBM Plex Mono | OFL | Servidas por `next/font` desde Google Fonts |

## Datos públicos usados y las dos versiones en línea

Solo para denominadores, trazabilidad territorial y la versión "con fuentes
reales"; nunca se mezclan con personas:

- [`publicos/README.md`](publicos/README.md): INEGI Censo 2020 (mujeres de 25 a
  64 por municipio de Jalisco), CONAPO marginación 2020, el catálogo nacional
  de municipios de INEGI (2,478; base de la trazabilidad por estado y
  municipio), defunciones C50/C53 2024. Todos con URL oficial y fecha de
  descarga.
- [`reportes-reales/README.md`](reportes-reales/README.md) (rama
  `fuentes-reales`): cuatro reportes reales —defunciones de mujeres por cáncer
  de mama y cervicouterino 2024 (INEGI EDR), egresos hospitalarios C50/C53 2024
  (Secretaría de Salud, DGIS/SAEH) y el catálogo CLUES de unidades de salud
  (Secretaría de Salud)— con su URL, licencia (Términos de Libre Uso INEGI /
  Libre Uso MX) y los scripts que los derivaron.

Las dos versiones en línea del prototipo:

| Versión | Qué trae | Límite declarado |
|---|---|---|
| **En blanco** | Los tres informes "Sin empezar"; se suben los reportes de prueba con formato de EIRA | Es la única donde se ve la deduplicación de personas (los datos de prueba traen identificador ficticio) |
| **Con fuentes reales** | Los reportes de datos abiertos ya procesados | Los datos públicos son agregados o registros sin identificador: muestran unificación de fuentes, calidad y detección del mismo archivo, **no** deduplicación de personas |

## Cómo se usó Devin

Hechos verificables en el repositorio:

- **Cinco revisiones del plan por agentes de Devin** (Python vs. TypeScript,
  duplicados de archivos, seguridad y privacidad, alcance e ingeniería):
  [`docs/contexto/revisiones-devin/`](docs/contexto/revisiones-devin/).
- **Auditoría de la sesión de trabajo** hecha por un agente Devin de solo
  lectura, publicada con sus hallazgos: [`docs/contexto/auditoria-sesion.md`](docs/contexto/auditoria-sesion.md).
- **Auditoría de referencias visuales** (details.so y sitios de origen):
  [`docs/referencias/`](docs/referencias/) en la rama `referencias`, con las
  capturas y la tabla de licencias resultante en `web/TERCEROS.md`.
- **Construcción por ramas con Devin:** `valkey-base` (contrato, semilla y
  verificador), `motor` (base SQLite), `fe` (frontend), `fuentes-reales`
  (datos públicos) y `referencias`; cada una con su `NOTAS.md` de bitácora.
- **Este paquete de entrega** (README, Devpost, guion y lista) en la rama
  `entrega`.

## Supuestos validados con EIRA

De la conversación del 21 de noviembre
([`docs/contexto/nota-granola-eira.md`](docs/contexto/nota-granola-eira.md);
mandan sus palabras sobre cualquier otro documento):

- Una fila por evento por persona; columnas: nombre, estudio, edad, ciudad,
  asistencia, tipo de servicio y su ID.
- El ID es iniciales + fecha de nacimiento `AAAAMMDD`, y ellas mismas
  identifican el riesgo de choque; se discutió agregar el estado o usar CURP.
- Las cifras que más piden donantes y aliados: personas impactadas, edad
  promedio y desglose por ciudad.
- La visión pedida es literalmente Subir → filtros de calidad → vista previa →
  exportar, con calificación tipo estrellas.

## Preguntas abiertas para EIRA

- Los encabezados exactos de sus Excel y el orden del ID (iniciales antes o
  después de la fecha); sus archivos de ejemplo no han llegado.
- Si sus reportes traen título arriba, fila de totales u hojas de resumen.
- Cuando dos coordinaciones registran la misma jornada, ¿es un servicio contado
  dos veces o son dos servicios?
- Cuáles son sus dos informes más importantes y para qué audiencia (sabemos que
  Tamizaje Rosa va a socios estratégicos).
- Qué registra "Me cuidan mientras aprendo" (existe en el catálogo como
  `por_confirmar`) y qué otras iniciativas faltan.
- Si prefieren migrar el ID a CURP o a iniciales + estado, y en qué plazo.

## Próximos pasos para un piloto

1. Integrar el motor en los entornos del demo, validar punta a punta desde el
   navegador y después con los Excel reales de ejemplo que EIRA quedó de
   compartir.
2. Acordar el identificador definitivo (CURP o ID mejorado) y la política de
   resolución de pares.
3. Cuentas, permisos por rol, respaldo automático y aviso de privacidad, con
   revisión de la ley de datos personales de 2025 por tratarse de datos de
   salud.
4. Delimitar un piloto con una coordinación, probar con datos sintéticos y
   luego con reales bajo autorización (la guía de EIRA lo prevé en su sección 8).
5. Plantillas de informe por audiencia, que EIRA ya pidió como deseable.
