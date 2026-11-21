## Hechos del repo

- Solo existe el andamiaje: `shared/types.ts` (contrato **viejo**: aún dice `direccion`, sin `idEira`/`curp`/`CalidadArchivo`), `server/claves.ts`, `shared/folio.ts`, `scripts/valkey-local.sh`. `node_modules` no está instalado. Cero código de producto.
- Los datos públicos de Jalisco ya están descargados y verificados en `publicos/`.
- El plan pide ~30 archivos producto + tests en 3 h restantes, con 3 tareas "en paralelo" y una sola persona.

## ¿Sobrecomplicado? (opinión)

Sí en alcance, no en concepto. Lo costoso no es TypeScript sino React+Vite (13 archivos, build, testing-library), auth por roles, SSE, Docker/Caddy y tests de componentes. El núcleo de valor (importar, deduplicar por huella, indicadores con Sets) es chico.

## Alternativa mínima en Python (FastAPI + HTMX)

| Archivo | Responsabilidad |
|---|---|
| `app.py` | Rutas: subir/previa/importar, indicadores, duplicados, informe CSV, asistencia |
| `motor.py` | Claves `imp:*`, Sets/`SINTERCARD`, hash de conteos, Stream de ajustes |
| `importar.py` | pandas/openpyxl, fechas, mapeo por sinónimos, `clavePersona` HMAC, estrellas |
| `datos.py` | Los 3 Excel sintéticos |
| `templates/*.html` (4) | Subir, Calidad, Tablero, Informe — HTMX desde CDN |
| `static/nfc.js` | ~25 líneas: `NDEFReader` → `POST /api/asistencia` |
| `requirements.txt` | fastapi, uvicorn, jinja2, pandas, openpyxl, redis-py (sirve a Valkey), rapidfuzz, python-multipart |

- **NFC:** Web NFC es JS de navegador (Chrome Android + HTTPS); el backend no lo cambia. `nfc.js` estático sirve igual en ambos stacks. Fallback: teclear folio o QR.
- **Despliegue:** `uvicorn` + `cloudflared tunnel` para HTTPS. Sin Docker ni build.

## Comparativa

| | Plan TS | Python mínimo |
|---|---|---|
| Archivos | ~30 | ~8 |
| Líneas est. | 3.500–4.500 | 700–1.000 |
| Horas con agentes | 5–8 | 1,5–2,5 |
| Riesgo de demo | Alto (integración API↔React, SSE, auth) | Bajo-medio (un proceso) |
| Usabilidad no técnica | Mejor (flujo guiado pulido) | Aceptable (widgets/HTMX) |
| Se pierde | — | SSE en vivo (sustituir por polling o quitarlo), tests de UI, pulido visual |

## Veredicto

**No cambiar de lenguaje; cambiar de superficie.** Reescribir en Python hoy quema ~45 min en rehacer el contrato y `claves.ts` que ya existen, y el problema real — alcance — sigue igual. La versión Python solo gana si el equipo piensa en Python más rápido que en TS.

**Recortes aunque se quede en TS:**
- **Matar React/Vite**: Hono sirviendo HTML + HTMX (o JSX de Hono). Elimina ~15 archivos, el build y testing-library. Es el mayor ahorro.
- **Auth → simulado declarado**: selector de rol sin token. Va en la tabla "Simulado" del README.
- **SSE → polling 3 s** o contador fijo; `imp:eventos` queda documentado.
- **Sin Docker/Caddy/compose**: `npm start` + túnel.
- **Tests solo del motor** (Tareas 2–3); cero tests de UI.
- **Conservar intocable**: huella sha256 (resuelve "mismo reporte, otro nombre" en ~10 líneas y es su necesidad #2), Sets/`SINTERCARD` para personas únicas, `imp:ajustes`, estrellas de calidad, denominadores ya descargados, NFC con fallback de tecleo.

Eso deja ~12 archivos y cabe antes de las 15:00.
