# STATE — Nerdearla Vibeathon (2026-11-21, entrega 16:00 CDMX)

- Meta: ganar 1.º o 2.º. Ian pivoteó al **Reto 3** (consolidación de impacto) con uso fuerte de Valkey, datos públicos + internos, folio único y NFC.
- Plan vigente: `docs/superpowers/plans/2026-11-21-impacto-eira.md`. Los planes de Reto 1 y Reto 4 del mismo día quedaron reemplazados.
- Ian va solo; agentes del VPS ejecutan; Ian despliega en AWS. VPS sin Docker ni Valkey: usar `scripts/valkey-local.sh` (binario precompilado).
- Hecho: investigación previa (jurado, benchmark, EIRA, Reto 4), plan Reto 3 escrito. Sin código todavía.
- En curso: 3 agentes Opus 5.5 esfuerzo alto para Reto 3 (fuentes en scratchpad `research-r3-*.md`). Tavily sin cuota; Exa y Firecrawl sin autorizar.
- Pendiente: incorporar investigación, mejorar preguntas a EIRA, visto bueno de Ian, luego Tarea 1.
- `.claude/` debe quedar en `.gitignore` (repo público).

## 2026-11-21 17:40
- Creado `QUE-HAREMOS.md` (resumen para colaboradores) + `.gitignore` (con `.claude/`). Commit inicial pusheado a `main`: docs de planes + resumen.
- Invitación a oeselma@yahoo.com: bloqueada — API de GitHub no admite email, solo username. Esperando username de Ian o que lo haga en Settings → Collaborators.
- session ended 2026-11-21T18:26:24+01:00
- Invitación enviada a SelmaOE (oeselma@yahoo.com) con permiso write, id 345396939. Pendiente de aceptación.

## 2026-11-21 ~12:00 CDMX
- Nota de Granola "Data management for social impact" (leída vía Hermes, solo resumen; sin transcripción) incorporada al plan del Reto 3: sección "Validado con EIRA" (ID actual = iniciales + AAAAMMDD, colisiones, estrellas de calidad, plantillas de informe, roles coordinacion/presidencia, 3 Excel).
- OJO: `shared/types.ts` en main (commit a828de2) quedó atrás del plan: faltan campos idEira/curp/edad/asistencia, CalidadArchivo, PlantillaInforme, rol presidencia. Actualizarlo es el primer paso al ejecutar.
- `docs/plan-visual.excalidraw` refleja el plan ANTERIOR a la nota (generador en scratchpad `gen/board.py`).
- Ian NO ha aprobado ejecutar. No lanzar trabajadores ni escribir código sin su visto bueno explícito.

## 2026-11-21 12:10 CDMX — NUEVO REPARTO (manda sobre lo anterior)
- La compañera (SelmaOE) hace en PYTHON el procesamiento: leer Excel, deduplicar, unificar reportes y programas.
- Nosotros: Valkey (base limpia), frontend y tableros, ejecutado por DEVIN (CLI `devin -p`, sesión iniciada). Ramas: `fe`, `valkey-base`. Worktrees: ../nerdearla-hack-fe, ../nerdearla-hack-valkey.
- Integración solo por Valkey: `docs/contrato-valkey.md` (v1, prefijo eira:, Stream eira:trabajos FE→Python, resultados en eira:fuente/per/cnt/anom/pares, decisiones por Stream eira:decisiones, Pub/Sub eira:eventos).
- El plan `2026-11-21-impacto-eira.md` vale por sus secciones de EIRA, duplicados y restricciones; su arquitectura de servidor TS quedó sustituida por Python + contrato.
- Sesiones Devin lanzadas 12:10: (a) valkey-base: claves, limpiar, semilla, verificar, ejemplo Python; (b) fe: habilidades modern-web-guidance + Hallmark, Next.js en web/, pantallas Subir/Calidad/Tablero/Informe/Registro, capturas en docs/capturas/; (c) benchmark UI 21st.dev + details.so → scratchpad devin2/out/c.md. Informes en scratchpad devin2/out/{a,b,c}.md.
- Valkey 6379 (sin contraseña) lo usa el FE; pruebas de valkey-base en 6391.
- Pendiente: respuestas de Ian (cómo recibe Python los archivos, dónde corre, NFC); integrar ramas; despliegue HTTPS; README; Devpost 15:20.
