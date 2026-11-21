# Paleta de EIRA y cómo se usa en el producto

Decisión de Ian (13:10): el frontend usa **la paleta de EIRA** (eiraac.org), mejorada. Sustituye a la regla anterior de "ningún rosa" y al acento verde bosque de la auditoría de details.so; de esa auditoría se conservan la estructura, el espaciado y la jerarquía.

## Lo que usa hoy su sitio

Colores extraídos del HTML y las hojas de estilo de https://eiraac.org/ el 2026-11-21, con el número de veces que aparece cada uno:

| Color | Veces | Qué es |
|---|---|---|
| `#7d3b3b` | 140 | Vino. Su color dominante: títulos y botones |
| `#ffd7de` | 74 | Rosa claro de fondo |
| `#ffa9b8` | 68 | Rosa medio |
| `#ff94a7` | 31 | Rosa intenso |
| `#6a2b51` | 25 | Ciruela |
| `#ffebee` | 22 | Rosa muy claro |
| `#f48c8c`, `#f29a9a` | 14 c/u | Coral |
| `#b7426c` | 9 | Frambuesa |
| `#2e2e2e` | 10 | Texto |
| `#7e8ba3` | 6 | Azul pizarra |

Tipografías de su sitio (Google Fonts, licencia abierta): **Montserrat**, **M PLUS Rounded 1c** y **Rosarivo** (con remates).

## Cómo se mejora

Su sitio usa los rosas como fondo de bloques enteros, lo que le quita seriedad a una herramienta de trabajo. La mejora es de proporción, no de color: **los tonos profundos mandan y los rosas quedan como matiz**.

| Papel | Token | Valor | Origen |
|---|---|---|---|
| Fondo de página | `--papel` | `#fdfaf9` | Derivado: blanco con un punto del vino |
| Superficie (tarjetas) | `--superficie` | `#ffffff` | Suyo |
| Texto | `--tinta` | `#2e2e2e` | Suyo |
| Texto secundario | `--tinta-suave` | `#6b5c5c` | Derivado del vino, desaturado |
| Línea y bordes | `--linea` | `#eadfdd` | Derivado |
| **Acción principal, paso actual, estrellas** | `--vino` | `#7d3b3b` | Suyo, el dominante |
| Acción principal al pasar el cursor | `--vino-oscuro` | `#5f2b2b` | Derivado |
| Segundo énfasis, segunda serie de gráficas | `--ciruela` | `#6a2b51` | Suyo |
| Fondo de elemento seleccionado o de aviso suave | `--rubor` | `#ffebee` | Suyo |
| Relleno de barras y progreso | `--rosa` | `#ffa9b8` | Suyo |
| Tercera serie de gráficas | `--pizarra` | `#7e8ba3` | Suyo |
| Atención | `--aviso` | `#b0595a` | Suyo |
| Error | `--error` | `#843f3f` | Suyo |

Reglas de uso:

- Rosa nunca como fondo de pantalla ni de tarjeta completa. `--rubor` solo en superficies pequeñas (fila seleccionada, banda de aviso) y `--rosa` solo como relleno de barras.
- No se usan `#ff94a7`, `#b7426c` ni los corales en áreas grandes ni en texto: son los que hacen ver el sitio infantil.
- Un solo color de acción por pantalla: `--vino`.
- Texto siempre `--tinta` sobre claro o blanco sobre `--vino` o `--ciruela`. Nunca texto rosa.
- Los estados se distinguen con palabra e icono además de color, porque la paleta no tiene verde: "Listo" va en `--tinta` con marca, "Atención" en `--aviso`, "Error" en `--error`.
- Tipografía: **Rosarivo** para títulos y cifras grandes, **Montserrat** para la interfaz. Son las suyas; la combinación con remates en las cifras es lo que da el tono sobrio. Identificadores en una monoespaciada.
- Tableros de Metabase: series en `--vino`, `--ciruela` y `--pizarra`.

Contraste: `#7d3b3b` y `#6a2b51` sobre blanco superan con holgura el mínimo para texto normal; `#ffa9b8` no se usa para texto.
