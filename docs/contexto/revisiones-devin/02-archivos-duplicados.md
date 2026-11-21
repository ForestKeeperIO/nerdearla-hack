Reviso el resto del plan y los archivos relacionados para no contradecir lo ya decidido.**Hechos del repo**

- `Fuente.huella` = sha256 del archivo y `imp:huellas` (Set) con `SADD`…=0 → "ya importado": hoy solo existe el **nivel 0 (bytes)** [claves.ts:10-11]. El plan pide en Review Focus que reimportar el mismo archivo no cambie indicadores y avise.
- Nada cubre (b)–(f): bytes distintos con mismo contenido. `duplicado_probable` es por fila *dentro* del archivo, no entre archivos.
- En Valkey no van nombres; solo HMAC con `IMPACTO_HMAC_KEY`. La bitácora es `imp:ajustes` (Stream).

**Mi propuesta (opinión, no está en el plan)**

**Normalización de fila antes de huellar:** aplicar `mapeo` → tomar solo campos canónicos en orden fijo `idEira|fechaNac|nombre norm|municipioClave|servicio|fecha|asistencia|cantidad` → `normalizarTexto`, `parseFecha`, booleano de asistencia → unir con `|` → `HMAC-SHA256`. Inmune a orden de filas/columnas, encabezados renombrados y formato (xlsx/csv).

**Niveles y claves Valkey**

| Nivel | Qué detecta | Clave / comandos |
|---|---|---|
| 0 bytes | copia idéntica | `imp:huellas` Set · `SISMEMBER`/`SADD` |
| 1 canónico | mismo contenido, otros bytes | `imp:huellas:canon` Set · `SISMEMBER`/`SADD` |
| 2 fila | traslape entre archivos | `imp:filas:<fuenteId>` Set, `imp:filas:duenio` Hash (huella→fuenteId) · `SADD`, `SINTERCARD`, `SCARD`, `HSET` |
| 3 % | versión vs archivo distinto | por fuente previa: `SINTERCARD imp:filas:nuevo imp:filas:<id>` ÷ `SCARD imp:filas:nuevo` |

**Casos**

| Caso | Ejemplo | Señal | Mensaje y decisión |
|---|---|---|---|
| a | `rosa.xlsx` y `reporte_final_2.xlsx` idénticos | nivel 0 | "Este archivo ya se importó el 21-nov como 'rosa.xlsx'. No se volverá a cargar." **Solo** |
| b | `rosa.xlsx` re-guardado por Excel | nivel 1 | "Mismo contenido que 'rosa.xlsx' (archivo re-guardado). Nada que importar." **Solo** |
| c | columnas `Fecha,ID,Nombre…` reordenadas/renombradas | nivel 1 | igual que b, +nota "las columnas venían en otro orden" **Solo** |
| d | `rosa_v2.xlsx` = filas viejas + 8 nuevas | traslape ≥90 % y `SINTERCARD`=SCARD(viejo) | "Parece una versión nueva de 'rosa.xlsx': 8 filas nuevas, 2 corregidas. ¿Reemplazar o agregar?" → **confirma presidencia**; al reemplazar, `HSET imp:fuente:<viejo> reemplazadaPor <nuevo>` + `XADD imp:ajustes`; a escala demo, re-ingesta desde los originales |
| e | `nutricion.xlsx` y `rosa.xlsx` comparten 30 filas | traslape 30–90 % | "Comparte 30 filas con 'rosa.xlsx'. ¿Mismo evento registrado dos veces?" → aviso en Calidad; **confirma** si cuentan una vez |
| f | `rosa.csv` exportado del mismo Excel | nivel 1 | como b: "Mismo contenido que 'rosa.xlsx' en CSV" **Solo** |

Umbral sugerido: ≥90 % versión, 30–89 % traslape parcial, <30 % distinto. Todo traslape >0 deja `Anomalia` + `Ajuste`.

**Casos límite**

- Fila de totales o filas vacías fantasma de Excel: excluir antes de huellar o rompen la huella canónica.
- Mapeo confirmado distinto entre subidas → huella canónica distinta (mitigar guardando el mapeo usado).
- Una celda corregida = fila nueva (hash nuevo); no se reconoce como "la misma fila editada".
- Mismo contenido con otra `fechaCorte` declarada: avisar la discrepancia.
- Filas agregadas ("asistentes: 45") sin persona: huellables pero no comparables con filas por persona.

**Preguntas para EIRA**

1. Cuando dos coordinaciones reportan la misma jornada, ¿son filas duplicadas o servicios distintos?
2. ¿Sus Excel traen hoja de totales/resumen además de las filas?
3. Si llegan dos versiones, ¿manda la más reciente o la que valida Presidencia?
4. ¿Una fila corregida conserva algún dato estable para reconocerla?
5. ¿Esperan deduplicar entre programas, o solo dentro del mismo programa?
