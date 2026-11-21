# Impacto EIRA · Diseño del producto

Fecha: 2026-11-21. Sustituye a la interfaz construida en la rama `fe` hasta el commit `aeba8f6`, que se hizo sin esta definición.

## Para quién es

**Una persona de Presidencia de EIRA.** No es técnica. Trabaja en una laptop. Hoy recibe por correo o mensaje los Excel de tres o más coordinaciones (Tamizaje Rosa, Salud que Florece, Nutrición…) y los junta a mano para contestarle a un donante o aliado. Lo hace unas cuantas veces al año, en las semanas en que hay que entregar un informe, así que cada vez llega sin recordar cómo se usa la herramienta.

Lo que le preocupa, en sus palabras (conversación del 21 de noviembre):

- Que juntar los Excel es lento y se presta a errores.
- Que su identificador (iniciales más fecha de nacimiento) puede repetirse entre dos personas.
- Que a veces llega el mismo reporte dos veces, con otro nombre.
- Que cada aliado pregunta cosas distintas, pero casi siempre: personas impactadas, edad promedio y desglose por ciudad.

## El trabajo que viene a hacer

**Armar un informe.** Empieza con una pregunta ("¿cuántas personas atendimos este año, para el informe de socios estratégicos?") y termina con un documento que puede mandar. Todo lo que hay en pantalla sirve a eso.

No viene a "explorar datos" ni a "administrar un sistema". Por eso la aplicación no es un panel con secciones entre las que se navega libremente: es **un recorrido con principio y fin**.

## El recorrido

Cuatro pasos por informe, con las palabras que usó EIRA. **No se puede saltar adelante**: cada paso se abre cuando el anterior está resuelto. Siempre se puede volver atrás.

| Paso | Qué hace la persona | Cuándo queda resuelto | Qué abre |
|---|---|---|---|
| 1. Subir | Arrastra los Excel de cada coordinación; por archivo dice de qué programa es | Hay al menos un archivo importado y ninguno procesándose | Calidad |
| 2. Calidad | Ve la calificación de cada archivo y lo que le falta; decide los casos dudosos de personas; puede restituir filas omitidas | No quedan decisiones pendientes, o confirma que continúa con N pendientes sabiendo que cuentan como una sola persona | Vista previa |
| 3. Vista previa | Revisa las cifras del informe tal como saldrán | Pulsa "Las cifras son correctas" | Exportar |
| 4. Exportar | Descarga o imprime | — | — |

Reglas del recorrido:

- El indicador de pasos muestra dónde está y qué falta. Un paso bloqueado se ve bloqueado y dice por qué ("Primero sube al menos un archivo"). No es un menú.
- Entrar por dirección directa a un paso bloqueado lleva al paso que toca.
- No hay barra lateral ni segunda navegación. Solo el indicador de pasos y, al pie de cada pantalla, un botón principal ("Continuar a Calidad") y uno secundario ("Volver").
- Si después de avanzar se sube otro archivo, los pasos posteriores se vuelven a abrir para revisión: Calidad y Vista previa dejan de estar resueltos.
- No hay selector de rol. La persona usuaria es Presidencia. Que no haya cuentas ni contraseñas se declara como simulado.

## Un informe por programa, y uno global

Decisión de Ian (13:00): el informe va **separado por programa**, igual que la carga, y existe además un informe **Global** con todos los programas. Para el demo se usan **dos programas más el Global**: Tamizaje Rosa y Salud que Florece (propuesta; son los del caso de la guía).

| Informe | Qué archivos recibe | Qué cifras muestra | Recorrido |
|---|---|---|---|
| **Tamizaje Rosa** | Solo los de ese programa | Solo las de ese programa | Subir → Calidad → Vista previa → Exportar |
| **Salud que Florece** | Solo los de ese programa | Solo las de ese programa | Subir → Calidad → Vista previa → Exportar |
| **Global** | Ninguno: usa lo que ya subió cada programa | Las de todos, con cada programa por separado y las personas contadas una sola vez aunque estén en varios | Calidad → Vista previa → Exportar |

Reglas:

- La pantalla de inicio muestra los tres informes como tres entradas, cada una con su avance ("Paso 2 de 4: Calidad", "Sin empezar", "Listo para exportar"). Se entra a uno y el recorrido guiado es el de ese informe.
- Dentro de un informe de programa no se pregunta el programa por archivo: ya se sabe. Solo se elige el tipo de registro, entre los que admite ese programa.
- El Global está bloqueado hasta que los dos programas tengan al menos un archivo importado, y lo dice ("Falta subir archivos de Salud que Florece").
- En el Global, Calidad muestra lo que solo se ve al juntar programas: personas que aparecen en los dos y filas que dos coordinaciones registraron igual. Vista previa muestra personas impactadas en total (sin contar dos veces a quien está en ambos), cuántas están en los dos programas, y luego cada programa con sus cifras.
- Subir un archivo a un programa vuelve a abrir para revisión los pasos posteriores de ese programa **y** los del Global.
- Cada informe guarda su estado por separado: `eira:informe:<alcance>`, con `<alcance>` igual a `tamizaje-rosa`, `salud-que-florece` o `global`.
- "Paso 0, Nuevo informe" desaparece: los tres informes ya existen; la fecha de corte se pide al entrar por primera vez a cada uno.

## Lo que debe tener cada pantalla

**Inicio.** Los tres informes (dos programas y el Global), cada uno con su avance y una sola acción ("Empezar", "Continuar" o "Ver informe"). En la versión en blanco los tres dicen "Sin empezar" y el Global aparece bloqueado con su motivo. Nada más en la pantalla.

**1. Subir.**
- Zona para arrastrar archivos `.xlsx` o `.csv`.
- Cada archivo es una fila con su estado en palabras: "Leyendo…", "Listo: 120 filas", "Ya se cargó como 'tamizaje-rosa.xlsx'", "Versión nueva: se agregan 8 filas", "No se pudo leer: …".
- Por archivo, programa y tipo de registro (atención, estudio, participación, entrega de insumo), con propuesta ya elegida cuando el nombre del archivo lo sugiere.
- Nada de tecnicismos: no se menciona Valkey, colas ni huellas.

**2. Calidad.**
- Por archivo: calificación de 1 a 5 estrellas, y en una frase qué le falta para subir ("8 filas sin ID").
- Los problemas, agrupados por tipo, con el número de fila para ir a corregir el Excel.
- "¿Es la misma persona?": un caso a la vez, dos registros lado a lado, y dos botones. Arriba, cuántos faltan.
- Filas que no se contaron por repetidas, con la opción "Contar de todos modos".

**3. Vista previa.**
- Las tres cifras que pidió EIRA primero: personas impactadas (como rango cuando hay registros sin identificar), edad promedio y desglose por ciudad.
- Después, atenciones y participaciones, cada una por separado y con una frase que dice por qué no se suman.
- Tablero de Metabase incrustado para mirar más a fondo.
- Cada cifra con su nota: de qué archivos sale y con qué fecha de corte. El detalle técnico de cómo se calculó queda en un desplegable discreto.

**4. Exportar.** El informe tal como se va a entregar, con notas al pie, y dos acciones: descargar CSV e imprimir o guardar PDF.

## Dos versiones en línea

| Versión | Qué trae | Para qué |
|---|---|---|
| **En blanco** | Nada. Los tres informes aparecen "Sin empezar" | Probar el recorrido desde cero, subiendo los reportes de prueba con formato de EIRA |
| **Con fuentes reales** | Informes ya avanzados con reportes de datos abiertos oficiales (INEGI y otros que se verifiquen), ya procesados | Ver la herramienta trabajando con información real |

Límite que se declara en la propia versión con fuentes reales: los datos públicos son agregados o registros sin identificador de persona. Sirven para mostrar la unificación de fuentes, la calificación de calidad, la detección del mismo archivo subido dos veces y los tableros. La deduplicación de personas solo se puede ver en la versión en blanco, con los reportes de prueba.

## Aspecto

- De gama alta: sobrio, preciso, con jerarquía clara. Las referencias salen de la auditoría de details.so (`docs/referencias/auditoria-componentes.md` en la rama `referencias`), reproduciendo el patrón con código propio.
- **Ningún rosa, magenta ni fucsia, en ninguna tonalidad.** Paleta neutra con un solo acento que no sea rosa.
- Texto de 16 px o más. Estados con palabras además de color. Todo operable con teclado.
- Sin datos decorativos: nada de variaciones porcentuales ni minigráficas sin un dato real detrás.
- Sin espacio muerto: una tarjeta ocupa lo que su contenido necesita.

## Fuera de alcance

Cuentas y contraseñas; varios informes a la vez; registro con tarjeta NFC; edición de filas dentro de la herramienta; plantillas de informe por aliado (el informe base trae las tres cifras que pidió EIRA).

## Lo que cambia en el contrato de Valkey

Una clave por informe, que escribe y lee solo el frontend: `eira:informe:<alcance>` (Hash) con `fecha_corte`, `creado_en`, `calidad_resuelta` (0 o 1) y `cifras_aprobadas` (0 o 1); `<alcance>` es `tamizaje-rosa`, `salud-que-florece` o `global`. Los programas activos del demo están en `catalogos/iniciativas.json` (campo `en_demo`). El resto del contrato no cambia.
