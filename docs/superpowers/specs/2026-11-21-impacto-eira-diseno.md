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

Cuatro pasos, con las palabras que usó EIRA. **No se puede saltar adelante**: cada paso se abre cuando el anterior está resuelto. Siempre se puede volver atrás.

| Paso | Qué hace la persona | Cuándo queda resuelto | Qué abre |
|---|---|---|---|
| 0. Nuevo informe | Le pone nombre, elige para quién es y la fecha de corte | Al guardar | Subir |
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

## Lo que debe tener cada pantalla

**Inicio (sin informe).** Una sola acción: "Crear informe". Dos líneas que dicen qué va a pasar. Nada más.

**Nuevo informe.** Tres campos: nombre, para quién (lista corta: socios estratégicos, donantes, uso interno) y fecha de corte.

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
| **En blanco** | Nada. Abre en "Crear informe" | Probar el recorrido desde cero, subiendo los reportes de prueba con formato de EIRA |
| **Con fuentes reales** | Un informe ya creado con reportes de datos abiertos oficiales (INEGI y otros que se verifiquen), ya procesados | Ver la herramienta trabajando con información real |

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

Una clave nueva, que escribe y lee solo el frontend: `eira:informe` (Hash) con `nombre`, `audiencia`, `fecha_corte`, `creado_en`, `calidad_resuelta` (0 o 1) y `cifras_aprobadas` (0 o 1). El resto del contrato no cambia.
