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
- Invitación a: bloqueada — API de GitHub no admite email, solo username. Esperando username de Ian o que lo haga en Settings → Collaborators.
- session ended 2026-11-21T18:26:24+01:00
- Invitación enviada a SelmaOE con permiso write, id 345396939. Pendiente de aceptación.

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
- Sesión Claude Code ya commiteó 5 veces en main (scaffold, plan ajustado con respuestas EIRA, tablero Excalidraw, contrato Valkey). Worktrees: `nerdearla-hack-fe` (rama fe) y `nerdearla-hack-valkey` (rama valkey-base).
- Pusheado todo a origin: main, fe, valkey-base. `docs/ESTADO-SESION.md` = espejo de STATE.md.
- Auto-sync: cron */2 min corre `.claude/sync-repo.sh` (commit wip en main + push --all). QUITAR tras el hackathon: `crontab -l | grep -v sync-repo | crontab -`.

## 2026-11-21 13:00 CDMX — estado tras la auditoría y el rediseño (manda sobre lo anterior)
- Ian rechazó el frontend (rosa, navegación libre en un flujo, no se entendió el uso). Especificación nueva: `docs/superpowers/specs/2026-11-21-impacto-eira-diseno.md` (recorrido guiado sin saltos, SIN rosa, sin barra lateral ni rol, dos versiones: en blanco y con fuentes reales).
- Plan vigente: `docs/superpowers/plans/2026-11-21-demo-integrado.md` (puertas G0-G7; Metabase + Splink + pandas + Valkey + SQLite). Skill executing-plans invocada; por orden de Ian las tareas las implementan agentes de Devin en paralelo (Ruling: desviación de la skill, que pide ejecución en línea — porque Ian lo pidió explícitamente — costo: sin revisor por tarea, hay que revisar capturas y pruebas a mano).
- Modelo de datos: `docs/base-de-datos.md` + `catalogos/iniciativas.json` (iniciativas, tipos de registro, rol de persona). El esquema del plan (Tarea 1) aún usa `programa`/`unidad` fijos: FALTA segunda pasada del motor para adoptar el catálogo.
- Protocolo: antes de acciones con efectos, dos líneas "Entendí / No haré" (auditoría de Devin en `docs/contexto/auditoria-sesion.md`).
- Devin en curso (informes en scratchpad devin3/out/): motor (rama motor, worktree) T1+T2+T3; metabase (clon aparte ../nerdearla-hack-metabase, rama metabase, puerto 3200); fe (rama fe) rehecho; fuentes-reales (rama); eira (investigación de iniciativas, solo lectura). Terminado: referencias (rama referencias: auditoría details.so, acento verde bosque #1C4633).
- En línea (versión VIEJA rechazada): https://presence-ability-grounds-selective.trycloudflare.com → next start :3100, Valkey base 0 con semilla. cloudflared en ~/.local/bin. Sustituir por dos entornos (blanco /0 :3100, real /1 :3101) al pasar G5.
- Límite de 5 worktrees por repo (hook). Se quitó el de valkey-base (ya integrado).
- Pendiente de Ian: correo de la compañera en el historial público; confirmar motor de referencia; formatos reales de EIRA.

## 13:12 CDMX — decisiones de Ian
- Informe separado POR PROGRAMA + GLOBAL. Programas del demo: Tamizaje Rosa y Melenas en Movimiento. Versión real: además "Datos públicos de salud (Jalisco)". Programas salen de `catalogos/iniciativas.json`, nada fijo en código.
- GLOBAL: persona en dos programas cuenta DOS veces (suma de programas). Donantes de cabello no son personas impactadas.
- FE relanzado (3.ª vez) con esto; brief en scratchpad devin3/fe.txt. Motor (1.ª pasada, esquema viejo) sigue corriendo: al terminar, lanzar 2.ª pasada con devin3/motor2.txt (catálogo, Melenas, roles, v_global, vistas para Metabase).
- Metabase listo (rama metabase, clon ../nerdearla-hack-metabase, :3200): falta quitar "[real]" de títulos, ancho completo, filtro por programa; reprovisionar sobre db/esquema.sql del motor.
- Entrega (rama entrega): README/devpost/guion en borrador; sustituir capturas viejas.
- Demo (rama demo): scripts en curso.

## 2026-11-21 ~19:15 — merge total
- Mergeadas a main y verificadas 0-ahead: fe, motor, fuentes-reales, referencias, valkey-base, entrega, metabase, demo. Conflictos resueltos: .gitignore (unión), NOTAS.md (concatenación por secciones).
- sync-repo.sh v2: cada ciclo commitea pendientes en TODOS los worktrees/clones nerdearla-hack-*, pushea su rama, mergea origin/* a main (aborta si hay conflicto) y pushea main. Salta árboles con rutas sin resolver.
- Ojo: clones separados (demo, entrega, metabase dirs) pushean por este mismo cron.

## 13:20 CDMX — pausado por orden de Ian ("todo lo demás sleep hasta mañana")
- Temporizadores detenidos: mobil3-harness-drain, leads-asana, orca-board-sync, mobil3-harness-heartbeat, asana-board-sync, mobil3-crosspost. Servicios detenidos: hermes-gateway, bot-brave, gh-runner-fintechjobs.
- NO se tocó: orca-serve, fintechjobs-pg-54330 (posible base en producción), night-watch, oom-prefer-agents, respaldos.
- REANUDAR MAÑANA: `bash ~/projects/.demo-eira/reanudar-temporizadores.sh`. Avisar a Ian si no lo pide.
