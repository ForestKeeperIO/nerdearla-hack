Voy a leer los tres archivos requeridos.El plan tiene 542 líneas; leo el resto.## Revisión de alcance — dirección de producto

**Hechos del repo** (verificados): solo existe el andamiaje — `shared/types.ts`, `shared/folio.ts`, `server/claves.ts`, datos públicos ya descargados en `publicos/` (INEGI, CONAPO, catálogo Jalisco). `types.ts` está desactualizado: falta `idEira`/`curp`/`edad`/`asistencia` en `Campo`, `colision_id` en reglas, `CalidadArchivo`, `PlantillaInforme`, y `Role` dice `direccion` en vez de `presidencia`. Lo demás es mi criterio.

### 1. Flujo mínimo (2 min)

- Subir `tamizaje-rosa.xlsx` y `salud-que-florece.xlsx` → mapeo propuesto solo → estrellas por archivo con "qué le falta".
- Re-subir el primero con otro nombre → "ya estaba cargado" (huella sha256).
- Tablero: **120 atenciones** y **80 participaciones** como tarjetas separadas; intento de sumarlas → error explicado. Personas únicas como rango verificada+probable/máximo; desglose por ciudad; edad promedio.
- Calidad: 2 colisiones de ID sembradas → confirmar "son distintas" → la cifra cambia y queda en bitácora.
- Informe → "Descargar CSV" / imprimir. Cada tarjeta muestra el comando Valkey real (`SINTERCARD … 0.4 ms`).

### 2. Triage de funciones

| Función | Decisión | Por qué | Min |
|---|---|---|---|
| Importación con mapeo | IMPRESCINDIBLE | Dolor #1 validado con EIRA | 35 |
| Archivo duplicado | IMPRESCINDIBLE | Requisito explícito del equipo; es un `SADD` | 10 |
| Estrellas de calidad | IMPRESCINDIBLE | Pedida literal por EIRA; barata | 15 |
| Colisiones de ID | IMPRESCINDIBLE | La pieza memorable; datos ya la siembran | 20 |
| Edad promedio | IMPRESCINDIBLE | Top-3 que piden donantes | 10 |
| Decisor con probabilidades | DESEABLE | JW ya existe para colisiones; mostrar % es casi gratis | 10 |
| Tercer archivo | DESEABLE | El dolor real son "3+ coordinaciones" | 15 |
| Plantillas por audiencia | DESEABLE | La base cubre el informe; la 2ª son ~2 indicadores | 15 |
| Tablero en vivo (SSE/Pub-Sub) | DESEABLE | Valkey real y visible; riesgo moderado | 20 |
| Cobertura INEGI | DESEABLE | Datos ya en `publicos/`; suma Impacto | 20 |
| CURP | FUERA | Solo aparece en el 3er archivo; no aporta al caso | — |
| Marginación CONAPO | FUERA | Indicador extra; se corta primero | — |
| Roles/login | FUERA | Usuarios simulados; el demo corre sin auth | — |
| NFC y folio | FUERA | Hardware sin validar + HTTPS obligatorio; `ligarFolio` se demuestra tecleando | — |

Fuera de la tabla, también imprescindibles: motor Valkey (~40), API + 4 pantallas (~50), sintéticos + `esperado.json` (~20), informe/exportar (~25). Con agentes en ramas paralelas cabe; en serie, no.

### 3. Memorable vs. riesgo en vivo

**Memorable:** mismo archivo distinto nombre rechazado; colisión de ID confirmada y la cifra moviéndose con bitácora; el comando `SINTERCARD` con milisegundos en cada tarjeta (para el juez de Valkey).

**Riesgo:** NFC (cortado — bueno); SSE detrás de túnel/proxy (que el tablero funcione estático); encodings/fechas raros si un juez pide subir su propio archivo (respuesta: "solo datos ficticios validados", plan lo exige).

### 4. Cronograma

| Hora | Hito |
|---|---|
| 12:15–12:30 | Actualizar `types.ts` a "Validado con EIRA"; generar 2 sintéticos + `esperado.json` |
| 12:30–14:00 | En paralelo: importar/calidad · motor · pantallas contra contrato |
| 14:00–14:20 | Integrar API; **primer recorrido completo del caso** (antes 13:15 — irreal) |
| 14:20–14:50 | Deseables en orden: tercer archivo, edad/INEGI, SSE, decisor |
| 15:00 | **Corte de funciones** (del plan; no negociable) |
| 15:00–15:30 | Video de respaldo 90 s, README, `devpost.md` |
| 15:30 | Envío Devpost; 15:30–16:00 ensayo y buffer |
