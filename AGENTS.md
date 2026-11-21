# Guía para agentes que trabajen en este repositorio

Proyecto de un día para la **Nerdearla Vibeathon by Devin** (CDMX, 2026-11-21). Entrega en Devpost a las **16:00 hora de CDMX**; corte de funciones a las 15:00. Reto 3 de la ONG **EIRA Movimiento Rosa A.C.**: consolidación y visualización del impacto social.

## Qué construimos

Presidencia de EIRA junta a mano los Excel de cada coordinación para armar informes. La plataforma: **subir Excel → calidad → vista previa → exportar**, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.

## Quién hace qué

| Parte | Lenguaje | Rama | Responsable |
|---|---|---|---|
| Procesamiento: leer Excel, deduplicar, unificar reportes y programas, escribir resultados | Python | la que abra su responsable (sugerida: `python`) | Compañera de equipo y su agente |
| Base Valkey limpia, datos de demostración, verificador del contrato | TypeScript | `valkey-base` | Ian, con Devin |
| Frontend y tableros | TypeScript (Next.js) en `web/` | `fe` | Ian, con Devin |

**Las dos partes no se llaman entre sí.** Se comunican solo por Valkey, con las claves de [`docs/contrato-valkey.md`](docs/contrato-valkey.md). Ese archivo es la fuente de verdad de la integración: cualquier cambio se hace ahí primero, en un commit propio a `main`, y se avisa al otro lado.

## Si eres el agente de la parte de Python, lee en este orden

1. [`docs/contrato-valkey.md`](docs/contrato-valkey.md): qué recibes y qué debes escribir. Trae un ejemplo ejecutable.
2. [`docs/contexto/nota-granola-eira.md`](docs/contexto/nota-granola-eira.md): lo que dijo EIRA sobre sus Excel, su ID y sus informes.
3. La sección "Cómo se omiten los duplicados" de [`docs/superpowers/plans/2026-11-21-impacto-eira.md`](docs/superpowers/plans/2026-11-21-impacto-eira.md): las tres capas, con ejemplos y los mensajes exactos que ve la persona.
4. [`docs/contexto/revisiones-devin/02-archivos-duplicados.md`](docs/contexto/revisiones-devin/02-archivos-duplicados.md) y [`05-ingenieria.md`](docs/contexto/revisiones-devin/05-ingenieria.md): algoritmo por niveles, casos límite y problemas típicos de Excel real.
5. [`docs/contexto/guia-eira.md`](docs/contexto/guia-eira.md), sección "RETO 3": el caso práctico y los límites.

De ese plan **no** sigas la arquitectura de servidor en TypeScript ni sus tareas: quedó sustituida por este reparto. Valen sus secciones de EIRA, duplicados y restricciones.

### Lo que tu parte debe cumplir

- Tomar trabajos del Stream `eira:trabajos` (grupo `procesadores`) y leer los bytes de `eira:archivo:<id>`.
- Detectar el mismo archivo aunque cambie de nombre, se vuelva a guardar, se reordenen columnas o se exporte a CSV; detectar versiones nuevas y traslape entre archivos; y escribir un `mensaje` claro en español en `eira:trabajo:<id>`.
- Escribir cada persona con **un solo identificador opaco** en los conjuntos `eira:per:*`: el frontend cuenta personas únicas con `SCARD` y `SINTERCARD` sobre ellos.
- Respetar el ID de EIRA (iniciales + fecha de nacimiento `AAAAMMDD`). Mismo ID con nombres distintos no se fusiona ni se separa solo: se escribe un par en `eira:pares` y lo decide una persona; la decisión llega por el Stream `eira:decisiones`.
- No escribir en Valkey nombres completos, teléfonos ni el ID en claro.
- Nunca usar conteos aproximados (HyperLogLog): la guía de EIRA prohíbe presentar una deduplicación estimada como cifra oficial.
- Unidades que no se suman entre sí: `atencion`, `estudio`, `participacion`, `entrega_insumo`.
- Avisar con `PUBLISH eira:eventos` cuando termine un trabajo.

### Datos de prueba

- Caso de la guía: un archivo con 120 atenciones y otro con 80 participaciones, con personas repetidas entre ambos.
- Columnas que dijo EIRA: nombre, estudio, edad, ciudad, asistencia, tipo de servicio, y su ID. Los encabezados exactos son supuestos: EIRA quedó de compartir sus Excel y no han llegado.
- Solo datos ficticios. Nada de datos reales de pacientes en el repositorio.

## Reglas para todos

- Trabaja en tu rama; no hagas push directo a `main` salvo cambios al contrato o a la documentación; nunca force-push.
- Todo texto visible para la usuaria, en español.
- Se dice "Valkey", nunca "Redis". Desde Python se usa el paquete `valkey`; desde Node, `iovalkey`.
- Se dice "seudonimizado", nunca "anónimo", "cifrado" ni "cumple".
- El README final debe distinguir lo implementado de lo simulado.
- No subas secretos, archivos `.env` ni rutas de máquinas personales.

## Dónde está cada cosa

| Ruta | Contenido |
|---|---|
| `docs/contrato-valkey.md` | Contrato de integración |
| `docs/contexto/` | Nota de EIRA, historial de decisiones, guía de EIRA, investigación inicial, revisiones de Devin, benchmark de interfaz |
| `docs/superpowers/plans/2026-11-21-impacto-eira.md` | Plan vigente (diseño de duplicados, restricciones, preguntas para EIRA) |
| `docs/fuentes/` | 479 enlaces de la investigación, por tema |
| `publicos/` | Datos públicos de INEGI y CONAPO ya descargados |
| `QUE-HAREMOS.md` | Resumen de una página |
