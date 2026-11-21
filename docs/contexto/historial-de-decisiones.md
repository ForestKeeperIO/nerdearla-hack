# Historial de decisiones (2026-11-21)

Resumen cronológico de las sesiones de trabajo con agentes de este día, para que cualquier agente o persona que llegue al repositorio entienda cómo se llegó al estado actual. Horas de CDMX. No son las transcripciones completas: esas incluyen datos privados de la cuenta y no se publican en un repositorio abierto.

## Línea de tiempo

| Hora | Qué pasó | Resultado |
|---|---|---|
| 10:19 | Arranque. Investigación en paralelo: jurado y patrocinadores, benchmark de ganadores, EIRA y los cuatro retos | Ver `investigacion-inicial.md` |
| 10:26 | Primer plan: Reto 1 (expediente único, trabajo sin conexión) | Reemplazado. `docs/superpowers/plans/2026-11-21-expediente-unico-eira.md` |
| 10:55 | Cambio al Reto 4 (entrega segura de resultados de Papanicolaou); 235 fuentes | Reemplazado. `docs/superpowers/plans/2026-11-21-entrega-resultados-eira.md` |
| 11:15 | Cambio al **Reto 3** (consolidación de impacto), con uso fuerte de Valkey, datos públicos y folio único | Decisión vigente |
| 11:20 | Investigación del Reto 3: datos de EIRA, datos públicos, Valkey y NFC, código abierto, ganadores, costos | `docs/fuentes/` (479 enlaces) |
| 11:30 | Andamiaje inicial en TypeScript subido a `main` | Lo sustituye la rama `valkey-base` |
| 11:41 | Conversación con EIRA | `nota-granola-eira.md`. Es la validación que manda |
| 11:52 | Plan ajustado a lo que dijo EIRA: su ID, colisiones, estrellas, plantillas | — |
| 11:56 | Cinco revisiones del plan hechas con Devin | `revisiones-devin/`. Conclusión: sobraba superficie, no idea |
| 12:03 | Plan simplificado y diseño de duplicados en tres capas | `docs/superpowers/plans/2026-11-21-impacto-eira.md` |
| 12:05 | **Nuevo reparto:** el procesamiento se hace en Python; Valkey, frontend y tableros aparte; integración solo por Valkey | `docs/contrato-valkey.md` |
| 12:10 | Devin empieza a construir en las ramas `valkey-base` y `fe` | En curso |

## Decisiones vigentes

1. **Reto 3** de EIRA: consolidación y visualización del impacto social.
2. **Objetivo en una frase:** subir los Excel de cada coordinación y obtener el informe, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.
3. **Reparto:**
   - Python: leer Excel, deduplicar, unificar reportes y programas, y escribir los resultados en Valkey.
   - Valkey, frontend y tableros: en TypeScript (Next.js), construidos con Devin.
   - Las dos partes no se llaman entre sí; se comunican por las claves de `docs/contrato-valkey.md`.
4. **Duplicados en tres capas:** mismo archivo (aunque cambie el nombre, se vuelva a guardar o se exporte a CSV), misma fila (versiones nuevas y traslape entre coordinaciones) y misma persona (mismo ID). Detalle y ejemplos en la sección "Cómo se omiten los duplicados" del plan.
5. **Se respeta el ID de EIRA** (iniciales + fecha de nacimiento). Si un mismo ID trae nombres distintos, decide una persona.
6. **Sin conteos aproximados.** La guía de EIRA prohíbe presentar una deduplicación estimada como cifra oficial, así que las personas únicas se cuentan con operaciones exactas de conjuntos; no se usa HyperLogLog.
7. **Unidades que no se suman:** persona, atención, estudio, participación, entrega de insumo.
8. **Privacidad:** en Valkey no van nombres completos ni el ID en claro. Se dice "seudonimizado", nunca "anónimo".
9. **Flujo de la interfaz, con las palabras de EIRA:** Subir → Calidad → Vista previa → Exportar, con calificación en estrellas por archivo.
10. **Fuera de alcance hoy:** CURP, marginación de CONAPO, sesiones con contraseña, Docker obligatorio.
11. **Deseables, en orden:** cobertura contra población de INEGI, tercer archivo, registro con tarjeta NFC, plantillas de informe por audiencia.

## Decisiones descartadas y por qué

| Descartado | Motivo |
|---|---|
| Reto 1 y Reto 4 | Se eligió el Reto 3 |
| Todo en TypeScript con servidor propio | El procesamiento de Excel lo hace mejor Python y lo lleva otra persona del equipo |
| Aplicación de navegador + API + eventos en un solo plan | Demasiadas piezas para una tarde; se separó por contrato |
| Deduplicar personas por nombre de forma automática | EIRA no permite presentar una estimación como cifra oficial |
| Usar el servicio Jev (TypeSafe AI) para decidir | Registro en pausa, servicio cerrado y alojado fuera de México; las decisiones se hacen con reglas y confirmación humana |
| Grabar la CURP en la tarjeta NFC | Revela datos personales; la tarjeta lleva solo un folio opaco |

## Herramientas y cómo se usaron

- **Devin (CLI):** cinco revisiones del plan en paralelo y la construcción de las ramas `valkey-base` y `fe`.
- **Modern Web Guidance** (Google Chrome) y **Hallmark** (`nutlope/hallmark`): habilidades instaladas para el frontend.
- **21st.dev y details.so:** referencias de interfaz.
- **Valkey 9.2.0:** binario oficial, verificado con su suma sha256. En el servidor de desarrollo no hay Docker.
- **Datos públicos:** INEGI (Censo 2020, catálogo de municipios, defunciones 2024) y CONAPO; ver `publicos/README.md`.

## Lo que no está en el repositorio

- Las transcripciones completas de las sesiones con agentes.
- La transcripción de la conversación con EIRA (Granola solo entregó el resumen).
- Los Excel reales de EIRA: quedaron de compartirlos y no han llegado.
