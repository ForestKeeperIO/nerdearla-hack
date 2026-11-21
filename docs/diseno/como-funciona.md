# Cómo funciona: qué se eliminó y qué se cuenta

El ancho de la cinta representa **filas**. Termina antes de los indicadores de personas y pares: las tres unidades no son intercambiables. El resultado global incluye donantes y cuenta cada identidad una sola vez; no es el indicador de personas impactadas por programa del Tablero.

| Pregunta | Evidencia |
|---|---|
| ¿Qué cambió? | Antes, el Tablero mostraba el resultado, no el recorrido. [Antes, Tablero a 1440 px](capturas/v2-tablero-1440.png) · [antes, a 390 px](capturas/v2-tablero-390.png). |
| ¿Qué ve la usuaria? | [Cómo funciona a 1440 px](capturas/como-funciona-1440.png) · [a 390 px](capturas/como-funciona-390.png). Son capturas de una lectura concreta de la demo, no la fuente de datos de la pantalla. |
| ¿Cómo se adaptó la dirección B? | Se conservaron los tipos, el lienzo, las tarjetas y el vino del Tablero. Una tabla con encabezados muestra archivo, veredicto y calidad; cambia de disposición según el ancho de su contenedor. El diagrama cambia a dos columnas en móvil. |
| ¿Qué no se puede contar? | Los conjuntos por programa permiten contar identidades compartidas, no distinguir todas las uniones automáticas de las decisiones humanas. La pantalla no atribuye ese cruce a la automatización. |
| ¿Cómo se verificó? | La prueba `web/e2e/como-funciona.spec.ts` sigue el enlace desde Subir archivos, compara el DOM con la respuesta de la ruta, espera otra lectura y simula un fallo de red sin modificar la base. |

El canal `eira:eventos` no conserva historial ni separa las bases del servidor. La página distingue la hora de recepción de una señal de la hora del último evento persistido en la bitácora de la base seleccionada.
