# Texto para Devpost

> Borrador para pegar en el formulario de Devpost (vibeathon-mexico-2026).
> Reto elegido: **Reto 3 — Consolidación y visualización del impacto social**,
> EIRA Movimiento Rosa A.C.

**Título:** Impacto EIRA — de los Excel de cada coordinación al informe, sin
contar dos veces

**Lema:** Presidencia sube los Excel; la plataforma une, limpia y explica cada
cifra.

## Inspiración

Presidencia de EIRA junta a mano los Excel de tres o más coordinaciones cada vez
que un donante o aliado pide un informe. Nos lo dijeron el mismo día del evento:
es lento, se presta a errores, su identificador (iniciales + fecha de
nacimiento) puede repetirse entre dos personas y a veces llega el mismo reporte
dos veces con otro nombre. Su visión, textual: subir Excel, aplicar filtros de
calidad, obtener vista previa y exportar.

## Qué hace

Un informe por programa y uno Global. En cada uno, un recorrido de cuatro pasos
que no se puede saltar:

1. **Subir** los `.xlsx` o `.csv` de la coordinación.
2. **Calidad**: cada archivo recibe de 1 a 5 estrellas con lo que le falta, y
   los casos de "¿es la misma persona?" los decide una persona, no el programa.
3. **Vista previa** con las tres cifras que pidió EIRA —personas impactadas,
   edad promedio y desglose por ciudad— cada una con su nota de qué archivos la
   produjeron y con qué fecha de corte.
4. **Exportar** el informe en CSV o impreso.

El demo usa dos programas deliberadamente distintos —Tamizaje Rosa (atenciones)
y Melenas en Movimiento (donaciones de cabello y pelucas entregadas)— más el
Global, porque la misma base sirve a programas de naturaleza distinta. En el
Global el total de personas es la suma de las de cada programa, y debajo se
muestra aparte cuántas aparecen en más de uno. Quien dona una trenza es donante
y no infla la cifra de personas impactadas.

Debajo, tres capas de deduplicación: el mismo archivo se reconoce aunque cambie
de nombre, se vuelva a guardar o se exporte a CSV; la misma fila en dos
coordinaciones se cuenta una vez; y la misma persona se resuelve con un
identificador opaco compartido entre programas. Nada de conteos aproximados: la
guía de EIRA prohíbe presentar una deduplicación estimada como cifra oficial.

## Cómo lo construimos

Frontend en Next.js que solo habla con **Valkey**: encola cada archivo en un
Stream, guarda el estado de cada trabajo y del recorrido de cada informe, y lee
conjuntos de personas con `SCARD`/`SINTERCARD` para contar únicas y hacer
cruces entre programas. El motor en Python (lee Excel/CSV, dos huellas
guardadas —archivo y fila— para omitir duplicados, y reglas exactas más
rapidfuzz para la identidad de personas) toma los trabajos de la cola y escribe
el resultado unificado en una base **SQLite** que alimenta los tableros de
**Metabase**. Splink está instalado como respaldo para escalar la vinculación;
no es la vinculación activa del prototipo. Frontend y motor nunca se llaman: se
comunican por el contrato de claves `eira:*`, que documentamos antes de escribir
código. Los datos personales se seudonimizan: en las bases no hay nombres ni el
ID de EIRA en claro. La interfaz reproduce con código propio patrones auditados
de referencias de diseño, con una tabla de licencias de cada componente.

## Retos

- El ID de EIRA tiene poca entropía y choca entre personas distintas: mismo ID
  con nombres distintos no se puede resolver automático, así que va a una
  persona y nunca se une solo.
- "El mismo archivo" no es el mismo nombre: huella de bytes, huella canónica
  del contenido y huella por fila para cubrir renombrado, re-guardado, columnas
  reordenadas y exportación a CSV.
- Seis horas para cinco piezas: las separamos por un contrato de claves para
  que cada rama pudiera construirse en paralelo sin llamadas entre ellas.
- Los Excel de ejemplo de EIRA no llegaron: las columnas se tomaron de la
  conversación y los encabezados quedaron como supuestos declarados.

## Logros

- Un contrato de Valkey verificado con un comprobador automático
  (`npm run verificar`: 9 chequeos en verde) que garantiza conteos exactos,
  conjuntos consistentes y cero nombres en la base.
- El motor ya corre: detección del mismo archivo en cinco niveles (idéntico,
  mismo contenido, versión nueva, traslape parcial, distinto) con mensajes en
  español para una persona no técnica, verificada sobre los siete archivos del
  caso de la guía; 60 pruebas en verde.
- El recorrido guiado por informe ya está construido: dos programas (Tamizaje
  Rosa y Melenas en Movimiento) más el Global, que suma las personas de cada
  programa y muestra aparte cuántas se repiten.
- Un modelo de datos por catálogo —iniciativas, tipos de registro y roles— que
  distingue "persona impactada" de "donante" y hace que agregar un programa sea
  agregar una entrada al catálogo.
- Trazabilidad territorial por estado y municipio con el catálogo nacional de
  INEGI (2,478 municipios), mostrada como presencia, no como faltante.
- Cuatro reportes con datos públicos reales de Jalisco —defunciones C50/C53 de
  INEGI, egresos hospitalarios y catálogo CLUES de la Secretaría de Salud— con
  URL, licencia y scripts de derivación, para la segunda versión en línea.
- Tableros de Metabase (Impacto y Calidad) provisionados por API con enlaces
  públicos que se pueden incrustar.
- Una tabla honesta de Implementado / Simulado / Para piloto en el README.

## Qué aprendimos

Que el problema difícil no es graficar, es decidir qué cuenta: una donante de
cabello no es una persona impactada, una inasistencia no es una atención, y un
mismo archivo con otro nombre no son dos reportes. También que la deduplicación
de personas con datos sensibles necesita un humano en el bucle: el sistema
propone y explica, una persona decide.

## Qué sigue

Integrar el motor de extremo a extremo con los Excel reales de ejemplo que EIRA
quedó de compartir; acordar el identificador definitivo (CURP o ID mejorado);
cuentas, respaldo y aviso de privacidad conforme a la ley de datos personales
de 2025 (son datos de salud); y un piloto acotado con una coordinación, como
prevé la propia guía de EIRA.

## Los seis criterios, con evidencia

- **Usabilidad.** El recorrido usa las palabras literales de EIRA (Subir,
  Calidad, Vista previa, Exportar), no se puede saltar pasos y cada mensaje es
  una frase en español ("Este archivo ya se cargó el 21 nov como 'rosa.xlsx'").
  Verificable en `docs/contrato-valkey.md` (campo `mensaje`) y en el flujo de
  `web/` (rama `fe`).
- **Impacto.** Ataca el trabajo manual real de Presidencia y la cifra que más
  les piden: personas impactadas sin contar dos veces el mismo archivo ni la
  misma fila, con nota de fuente y fecha de corte por cifra, tal como pide la
  guía (trazabilidad de indicadores).
- **Escalabilidad.** El contrato de claves desacopla frontend y motor; los
  conteos son conjuntos y hashes en Valkey, no consultas costosas; el catálogo
  de iniciativas, tipos de registro y roles admite programas nuevos sin tocar
  el modelo ni el código —agregar un programa es agregar una entrada. La
  vinculación activa usa reglas exactas y rapidfuzz; Splink está instalado como
  la pieza prevista para escalar a decenas de miles de registros.
- **Privacidad y confianza.** Seudonimización desde la entrada: ninguna base
  guarda nombres ni el ID en claro; el comprobador del contrato incluye una
  prueba que busca nombres ficticios en las claves y no encuentra ninguno. Los
  límites están declarados (sin cuentas, ID de poca entropía, sin afirmar
  cumplimiento legal).
- **Innovación.** Deduplicación en tres capas con memoria persistente en Valkey
  (dos huellas guardadas —archivo y fila— más la de contenido derivada de las
  de fila) y un humano en el bucle para la identidad de personas: el sistema
  propone pares con probabilidad, una persona decide, y la bitácora conserva la
  trazabilidad.
- **Funcionamiento real del prototipo.** Implementado y verificable hoy: la
  base Valkey con semilla y verificador (9 chequeos OK), el motor con 24
  pruebas en verde y los siete archivos del caso procesados con sus mensajes
  exactos, el esquema SQLite con catálogos y municipios INEGI, los tableros de
  Metabase provisionados por API con enlaces públicos, y el recorrido guiado
  por informe del frontend (dos programas + Global) ejercitado en capturas. Lo
  que falta —correr frontend y motor juntos en los entornos en línea, la paleta
  de EIRA aplicada, el bloque de presencia y los tableros incrustados— está
  marcado como pendiente en el README, no simulado como hecho.

## Construido con

Valkey (cola, memoria de duplicados, conjuntos de personas, estado del
recorrido en vivo) · iovalkey · Next.js 16 + React 19 + TypeScript · Tailwind +
componentes shadcn/ui · Python 3.12 con uv · pandas + openpyxl · RapidFuzz ·
Splink 4 (instalado, en respaldo) · SQLite · Metabase (AGPL, servicio aparte) ·
Datos abiertos INEGI, CONAPO y Secretaría de Salud · Devin (revisiones,
auditorías y construcción por ramas).
