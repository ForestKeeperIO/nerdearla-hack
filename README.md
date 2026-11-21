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
| Subir archivos | `docs/capturas/subir.png` |
| Informe | `docs/capturas/informe.png` |

*(Capturas del frontend tal como está construido en la rama `fe`.)*

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

# 3. Base de reporte SQLite y reportes de prueba (rama motor)
uv run python -m db.crear --con-denominadores   # escribe data/impacto.sqlite
uv run pytest db scripts                        # 11 pruebas (esquema + reportes)

# 4. Metabase (rama metabase)
bash metabase/arrancar.sh                        # descarga el JAR y arranca en :3200
uv run metabase/datos_prueba.py                  # SQLite ficticio de prueba
uv run --with requests metabase/provisionar.py --entorno blanco --db data/impacto.sqlite

# 5. Frontend (rama fe)
cd web && npm install
VALKEY_URL=redis://127.0.0.1:6391 npm run dev     # http://localhost:3000
```

Variables: `VALKEY_URL` (con número de base para separar entornos) y
`VALKEY_PASSWORD`. Metabase genera su propia cuenta de administración en
`.metabase/credenciales.json` (ignorado por git); no hay otros servicios ni
credenciales.

**Pendiente de integrar** (diseñado, sin código aún): el motor de procesamiento
(`python -m motor.worker`) y el arranque de los dos entornos (`scripts/demo.sh`).
La incrustación de los tableros de Metabase en el frontend también está
pendiente (los enlaces públicos ya existen en `metabase/enlaces.json`).

## El recorrido

Hay un informe por programa y uno **Global**. La persona de Presidencia entra al
informe que va a armar (por ejemplo, Tamizaje Rosa para socios estratégicos) y
recorre cuatro pasos que no se pueden saltar:

1. **Subir.** Arrastra los `.xlsx` o `.csv` de esa coordinación; cada archivo dice
   su estado en palabras ("Listo: 120 filas", "Ya se cargó como 'rosa.xlsx'").
2. **Calidad.** Cada archivo recibe de 1 a 5 estrellas con lo que le falta
   ("8 filas sin ID"), los problemas por tipo y los casos de "¿es la misma
   persona?", que decide una persona, no el programa.
3. **Vista previa.** Las tres cifras que pidió EIRA primero —personas
   impactadas, edad promedio y desglose por ciudad— cada una con su nota de qué
   archivos la producen y con qué fecha de corte.
4. **Exportar.** El informe con notas al pie, para descargar en CSV o imprimir.

El informe Global usa lo que ya subió cada programa: muestra las personas en
más de un programa y las cuenta una sola vez, y después cada programa por
separado.

## Cómo se omiten los duplicados

Tres capas independientes, para no contar dos veces lo mismo:

| Capa | Qué se detecta | Ejemplo |
|---|---|---|
| Archivo | Huella de los bytes y huella canónica del contenido | `reporte_final_2.xlsx` es copia exacta y se rechaza; el mismo Excel vuelto a guardar, con columnas en otro orden o exportado a CSV se reconoce como `mismo_contenido`; una versión con filas nuevas solo agrega lo nuevo |
| Fila | Huella de cada fila contra todas las ya contadas | Si Tamizaje Rosa y Nutrición registran la misma jornada, las filas repetidas se omiten y quedan listadas para restituirlas si fue un error |
| Persona | Un solo identificador opaco por persona en Valkey | Quien aparece en Tamizaje Rosa y en Salud que Florece cuenta una vez en el Global. Mismo ID con nombres distintos **no** se une ni se separa solo: queda en `eira:pares` y lo decide una persona |

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
        │                                  ▲
        │                                  │ XREADGROUP
        │                           Motor Python (pendiente de integrar)
        │                           pandas lee el Excel, huellas omiten
        │                           duplicados, Splink propone vínculos
        │                                  │ escribe en una transacción
        ▼                                  ▼
Metabase ◄────────── SQLite data/impacto.sqlite (base de reporte)
(servicio aparte)         vistas v_* que leen los tableros
```

**Qué hace Valkey exactamente:** es la cola de trabajos (Stream con grupo de
consumidores), la guarda temporal del archivo subido, la memoria de duplicados
(huellas de archivo, contenido y fila), los conjuntos de personas que permiten
contar únicas y hacer cruces con `SCARD`/`SINTERCARD`, el estado en vivo de cada
trabajo y el canal de avisos. No es un caché: el frontend y el motor **solo** se
comunican por estas claves ([`docs/contrato-valkey.md`](docs/contrato-valkey.md)).

**Si se pierde Valkey:** se pierden la cola, las huellas de duplicados y el estado
en vivo. Los resultados consolidados están en SQLite y sobreviven; se puede
reconstruir reimportando, pero un archivo en tránsito podría procesarse dos veces
y habría que revisar. Para un piloto: persistencia AOF y respaldo junto con el
SQLite.

## Modelo de datos

El esquema completo (tablas, vistas y reglas) está en
[`docs/base-de-datos.md`](docs/base-de-datos.md); los programas e iniciativas en
[`catalogos/iniciativas.json`](catalogos/iniciativas.json). Dos decisiones
importan:

- **Unidades que no se suman:** una atención, un estudio, una participación y una
  entrega de insumo son cosas distintas; el informe las muestra por separado.
- **No toda persona en la base es "persona impactada":** EIRA tiene iniciativas
  como Melenas en Movimiento, donde una donante de cabello no es una
  beneficiaria. El catálogo distingue roles (`beneficiaria`, `participante`,
  `donante`, `voluntaria`) y las vistas de personas solo cuentan los dos
  primeros; donantes y voluntarias se reportan aparte. Si se contaran igual, la
  cifra de personas impactadas saldría inflada.

## Implementado / Simulado / Para piloto

| Pieza | Estado |
|---|---|
| Valkey local, semilla de demostración, verificador del contrato (`npm run valkey/semilla/verificar`) | **Implementado** en `main`/`valkey-base`; `verificar` reporta 9 comprobaciones OK |
| Esquema SQLite de reporte con vistas y denominadores INEGI (`db/`) | **Implementado** en rama `motor`; 6 pruebas en verde |
| Frontend: subida de Excel a Valkey, calidad con estrellas, tablero, informe y exportar CSV (`web/`) | **Implementado** en rama `fe` (versión con barra lateral); recorrido guiado de tres informes por verificar al integrar |
| Catálogo de iniciativas y tipos de registro | **Implementado** (`catalogos/iniciativas.json`); una iniciativa marcada `por_confirmar` |
| Reportes con datos públicos reales de Jalisco (`reportes-reales/`) | **Implementado** en rama `fuentes-reales` (4 CSV con fuente y fecha) |
| Motor Python: leer Excel, huellas de archivo/fila, deduplicar personas con Splink, escribir Valkey + SQLite | **Pendiente**: diseñado en el plan, sin código (`py/` solo trae un ejemplo) |
| Detección de "el mismo archivo con otro nombre" y "la misma persona" de punta a punta | **Pendiente**: definida en el contrato; sin motor que la ejecute |
| Reportes de prueba del caso de la guía (7 archivos: 120 atenciones, 80 participaciones, traslapes y versiones) | **Implementado** en rama `motor` (`reportes/` + `esperado.json`); sus pruebas en verde |
| Tableros de Metabase (Impacto y Calidad, con enlaces públicos e iframe verificado) | **Implementado** en rama `metabase` sobre un esquema provisional con datos ficticios; falta apuntarlo al esquema de `db/` e incrustarlo en el frontend |
| Recorrido guiado por informe (dos programas + Global) | **Por verificar al integrar**: la especificación es posterior al frontend construido |
| Cuentas, contraseñas y permisos por rol | **Simulado**: el prototipo no tiene; es requisito de piloto |
| Versión "con fuentes reales" ya procesada en línea | **Pendiente**: los archivos existen; falta el motor que los procese |
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
- **Si falla:** el recorrido vuelve a abrir los pasos por revisar; un trabajo
  que se cae a media carga no queda marcado como cargado y se puede reintentar
  (regla del diseño, por verificar con el motor). Los errores se ven en la
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
| Splink, pandas, RapidFuzz | MIT / BSD | Motor de procesamiento (pendiente de integrar) |
| DuckDB | MIT | Motor interno de Splink |
| SQLite | Dominio público | Base de reporte |
| Next.js, React, iovalkey, Radix, TanStack, sonner | MIT / ISC / Apache-2.0 | Detalle por paquete en `web/package.json` (rama `fe`) |
| Metabase | **AGPL** | Se ejecuta como servicio aparte; no se copia código suyo al repositorio |
| Componentes de interfaz | Ver tabla completa | [`web/TERCEROS.md`](web/TERCEROS.md) en la rama `fe`: qué se copió (solo MIT), qué se reimplementó y por qué |
| Tipografías Inter e IBM Plex Mono | OFL | Servidas por `next/font` desde Google Fonts |

## Datos públicos usados

Solo para denominadores y la versión "con fuentes reales"; nunca se mezclan con
personas:

- [`publicos/README.md`](publicos/README.md): INEGI Censo 2020 (mujeres de 25 a
  64 por municipio de Jalisco), CONAPO marginación 2020, catálogo de municipios
  INEGI, defunciones C50/C53 2024. Todos con URL oficial y fecha de descarga.
- [`reportes-reales/README.md`](reportes-reales/README.md) (rama
  `fuentes-reales`): cuatro reportes de cáncer de mama y cervicouterino en
  Jalisco de INEGI y Secretaría de Salud, con su URL, licencia (Términos de
  Libre Uso INEGI / Libre Uso MX) y los scripts que los derivaron. Incluye la
  nota honesta: son agregados o registros sin identificador; sirven para
  unificación y calidad, **no** para deduplicación de personas.

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

1. Integrar el motor y validar punta a punta con los Excel reales de ejemplo
   que EIRA quedó de compartir.
2. Acordar el identificador definitivo (CURP o ID mejorado) y la política de
   resolución de pares.
3. Cuentas, permisos por rol, respaldo automático y aviso de privacidad, con
   revisión de la ley de datos personales de 2025 por tratarse de datos de
   salud.
4. Delimitar un piloto con una coordinación, probar con datos sintéticos y
   luego con reales bajo autorización (la guía de EIRA lo prevé en su sección 8).
5. Plantillas de informe por audiencia, que EIRA ya pidió como deseable.
