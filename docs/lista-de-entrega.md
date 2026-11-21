# Lista de entrega — antes de las 15:20

Hora tope de funciones: 15:00. Envío en Devpost: antes de las 16:00.
Formulario: https://vibeathon-mexico-2026.devpost.com/
Segunda pasada hecha a las ~13:45; lo marcado **[POR VERIFICAR]** sigue sin
comprobarse a esa hora.

## Repositorio

- [ ] Repositorio **público** en GitHub
- [ ] Licencia abierta en la raíz (`LICENSE`, MIT — existe; verificar que está en `main`)
- [x] `README.md` en la raíz, en español, con: cómo levantarlo, credenciales/servicios, arquitectura, tabla Implementado/Simulado/Para piloto, riesgos, costos, próximos pasos y preguntas abiertas (segunda pasada hecha en rama `entrega`; verificar que queda en `main` tras integrar)
- [ ] Ramas de trabajo integradas o, como mínimo, referenciadas en el README — `fe` ya es `web/` en `main`; `motor`, `metabase`, `demo` y `fuentes-reales` referenciadas
- [ ] Sin secretos, `.env` ni rutas de máquinas personales en el historial
- [x] Capturas en `docs/capturas/` actualizadas a las de `origin/fe` (portada, subir, calidad, vista previa, melenas, global, exportar, metabase)

## Prototipo en línea

- [ ] **[POR VERIFICAR]** Versión **en blanco** con el frontend nuevo (recorrido por informe) servida por URL HTTPS pública. El :3100 sigue sirviendo el build viejo con barra lateral; falta reconstruir y reemplazar
- [ ] **[POR VERIFICAR]** Motor cableado a un entorno en línea (la verificación de los 7 archivos fue local, en la base 15 del :6391, no desde el navegador)
- [ ] **[POR VERIFICAR]** Versión **con fuentes reales** accesible por URL HTTPS pública (:3101 caído a esta hora; datos y scripts listos en rama `demo` / `fuentes-reales`). Si no llega: se declara pendiente y se enseña local o en video
- [ ] **[POR VERIFICAR]** `curl -I` a cada URL responde 200 justo antes del pitch
- [ ] **[POR VERIFICAR]** Recorrido de la demo ensayado una vez completo (guion en `docs/guion-demo.md`; ojo: el .xlsx de Melenas no existe, su informe sale de la semilla)
- [ ] **[POR VERIFICAR]** Datos de demostración cargados / base en blanco según toque (`web/scripts/semilla-dev.ts` apunta a la base 5; confirmar a qué base debe sembrar el entorno blanco)

## Pendientes de función conocidos (declarar si no llegan)

- [ ] **[POR VERIFICAR]** Paleta de EIRA aplicada al frontend (documentada en `docs/referencias/paleta-eira.md`; el código aún trae el acento anterior)
- [ ] **[POR VERIFICAR]** Bloque de presencia territorial en Vista previa (vistas `v_presencia*` listas en el esquema; `eira:presencia:*` solo propuesta)
- [ ] **[POR VERIFICAR]** Tableros de Metabase apuntados al esquema de `db/` e incrustados en el frontend (hoy corren sobre esquema provisional con datos ficticios)
- [ ] **[POR VERIFICAR]** Asentar `eira:huellas:*` y `eira:informe:*` en `docs/contrato-valkey.md` (las usa el código; el contrato no las trae)

## Video de respaldo

- [ ] Grabado (≤ 90 s, el recorrido del guion) **antes de las 15:00**
- [ ] Subido como video del proyecto en Devpost
- [ ] Copia local en el laptop que presenta, sin depender de internet

## Devpost

- [ ] Proyecto creado y texto de `docs/devpost.md` pegado (ya actualizado a los dos programas)
- [ ] Reto elegido en el formulario: **Reto 3 — Consolidación y visualización del impacto social** (EIRA)
- [ ] URL del repositorio y URL(s) del prototipo en línea
- [ ] Video enlazado
- [ ] **Todos los integrantes del equipo agregados** al proyecto en Devpost
- [ ] Envío hecho con margen (objetivo interno: 15:45; cierre real: 16:00)

## Honestidad final

- [x] La tabla Implementado/Simulado refleja lo construido a las ~13:45, no lo planeado
- [ ] Re-verificar ramas (`git fetch`, `git log`, `NOTAS.md`) antes de cerrar el README
- [x] Nada promete cumplimiento legal ni deduplicación estimada como cifra oficial
- [x] Splink descrito como respaldo instalado, no como vinculación activa
