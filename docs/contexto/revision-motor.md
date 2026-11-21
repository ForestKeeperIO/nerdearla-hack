# Revisión independiente del motor en Python

> Hecha por un agente de Devin, de solo lectura, sobre el commit `e5871e2` de la rama `motor` (primera pasada del motor), el 2026-11-21 a las 13:20 CDMX. Los hallazgos no están corregidos todavía salvo que se indique en `NOTAS.md` de esa rama. Las líneas citadas son de ese commit.

## Crítico

**1. Divergencia permanente SQLite↔Valkey tras caída en la ventana fatídica** — `escribir.guardar` (`escribir.py:55-174`) hace commit en SQLite y *después* el MULTI de Valkey. Si el proceso muere, o Valkey está caído entre ambos pasos, la fuente existe en SQLite pero no hay `eira:fuente:*`, `eira:cnt`, `eira:per:*` ni `eira:huellas:fila`. Al reintentar, `worker.py:220-238` ve `huella_bytes` y reporta "idéntico", así que **el archivo queda contado en SQLite y jamás en Valkey**: el tablero lo pierde y la deduplicación de filas futuras no conoce sus filas. La usuaria ve "ya se cargó" pero sus cifras no aparecen. Corrección mínima: al reintentar con `previa`, verificar que `eira:fuente:<id>` exista; si falta, re-ejecutar solo la mitad Valkey de `guardar`.

**2. No hay recuperación de mensajes pendientes** — `ciclo` (`worker.py:373-388`) usa `XREADGROUP ... ">"` sin nunca llamar `XAUTOCLAIM`/`XPENDING`, y hace `XACK` en `finally` incluso tras excepción. Un consumer que muere a media ingestión deja el mensaje pendiente **para siempre** (trabajo colgado en "procesando"); un mensaje que falla se pierde sin reintento. Corrección: XAUTOCLAIM al arranque y `xack` solo tras éxito (o tras N entregas).

**3. Deduplicación check-then-act entre procesos** — `worker.py:128-153` lee `eira:huellas:fila` con `hmget` y escribe después (`escribir.py:167-169`). Con dos workers, dos archivos que comparten filas pasan el chequeo a la vez y **ambas cuentan las filas compartidas** en SQLite y Valkey. El plan dice "un trabajo a la vez", pero nada lo impone (CONSUMIDOR=`py-{pid}` invita a escalar). Corrección mínima: `HSETNX` para reclamar la huella antes de contarla, o un lock `SET NX` por lote.

## Importante

**4. Clave HMAC con default público** — `huellas.py:24-25`: si falta `IMPACTO_HMAC_KEY` usa `"eira-demo-hmac"` en silencio; cualquiera puede revertir seudónimos y huellas por fuerza bruta de nombres/IDs. Corrección: `KeyError`/fail-fast al arrancar.

**5. La decisión "misma" se deshace sola** — `_decidir_par` borra `identidades` y `personas` de *b* (`worker.py:277-279`), pero `persona_id` es determinista: el siguiente archivo con ese ID+nombre recrea *b* como persona distinta. La corrección humana no sobrevive a la siguiente carga. Además el chequeo `pendiente` (`:269`) impide reparar Valkey si el proceso cayó entre el commit y el pipeline. Corrección: `UPDATE identidades SET persona_id=a` (deduplicando PK) en vez de DELETE.

**6. Pares pendientes cuentan como dos, no como una** — la spec ("cuentan como una hasta que alguien decida") no se cumple: `vincular` crea dos personas y ambas entran a `eira:per:todas`; la cifra de "personas impactadas" sale inflada mientras haya pares pendientes.

**7. Celdas combinadas no se resuelven** — `leer.py` no hace forward-fill: en Excel real con `Ciudad` o `Asistencia` combinada, todas las filas menos la primera quedan vacías → `ciudad_desconocida` masivo y huellas colapsadas. Corrección: `ffill` sobre las columnas mapeadas tras leer la hoja.

**8. `posible_correccion` no existe** — regla declarada en contrato y plan (fila corregida = huella nueva = **doble conteo silencioso**), sin implementación. Tampoco `estado_clave` del mensaje (siempre catálogo Jalisco), ni `eira:presencia:<alcance>` (contrato líneas 100-104), ni columnas `estado`/`municipio` ni vistas `v_presencia*`. Splink instalado pero jamás usado — los pares solo salen por mismo-ID; nada más se propone.

**9. Personas sin ID se fusionan solo por nombre** — `personas.py:100`: `folio|nombre_norm` une en silencio a dos "María López" distintas de coordinaciones diferentes, sin par de revisión. Y filas sin ID *ni* nombre colapsan por huella idéntica → subcuenta.

**10. `_restituir_fila` destruye la cantidad** — `worker.py:328` fija `cantidad=1.0` (la original se guardó como `0.0` en `escribir.py:84`) y suma `+1` a `eira:cnt`; en reportes agregados una fila restituida de 45 pasa a valer 1. Tampoco actualiza `fuentes.filas_omitidas` ni `eira:fuente:*`.

**11. CSV con `;` se importa como basura "listo"** — `leer.py:124` no detecta delimitador; los CSV reales de Excel es-MX quedan en una sola columna y se importan vía `sin_personas` tomando la primera columna numérica (p. ej. un año o teléfono).

## Menor

- `v_calidad` (`esquema.sql:98-103`): `COUNT(*)` con LEFT JOIN → fuentes sin anomalías muestran `problemas=1` con regla NULL; usar `COUNT(a.id)`.
- `worker.py:206`: `inasistencias` cuenta filas omitidas (contado=0) → inflado en archivos traslapados.
- `escribir.py:147-150`: `hincrby eira:sinid 0` para inasistencias sin persona → campos basura en 0.
- `worker.py:259`: `str(e)` del error va al mensaje visible; puede filtrar contenido de celdas/nombre de hoja. También `nombre` de archivo (que puede contener un nombre propio) se guarda en SQLite/Valkey/bitácora.
- `IntegrityError` por `unidad` inválida (CHECK en `registros`) se reporta como "ya se cargó antes" (`worker.py:231`).
- `huellas.evaluar`: traslape 100 % repartido entre dos fuentes previas → "version_nueva … se agregan 0" y fuente con `filas_nuevas=0`.
- `leer.py`: `%d de %B de %Y` depende de locale (no parsea "marzo"); serial de Excel como texto en CSV → `fecha_invalida`; IDs con guiones/espacios internos no se toleran (spec vieja lo pedía); encabezados duplicados colapsan; `.xlsm` no se rechaza ni hay límite de 10 MB/20 000 filas; `_NOMBRES`/`_PERSONAS` crecen sin tope y la similitud degrada a 0.5 tras reinicio (documentado).
- `eira:nac` guarda fecha de nacimiento completa (permitido por contrato, pero es el dato más re-identificable junto con ciudad).
- Pruebas: `test_fallo_a_media_carga` inyecta el fallo *antes* de escribir — nunca cubre la ventana SQLite-commit/Valkey-EXEC que es el riesgo real; no hay prueba de concurrencia, de reentrega, ni de restituir filas agregadas; `test_contrato` exige `npm` y el repo del frontend; `test_reporte_sin_personas` escribe en `reportes/` compartido.

## Las 5 correcciones primero (30 min)

1. `clave_hmac()` sin default: `os.environ["IMPACTO_HMAC_KEY"]` → crash explícito.
2. `xack` fuera del `finally` + `XAUTOCLAIM` al arranque (mensajes recuperables).
3. En `previa`/reintento: si `eira:fuente:<id>` no existe, re-emitir la parte Valkey de `guardar` (cierra la divergencia del hallazgo 1).
4. `_restituir_fila`: no pisar `cantidad` (guardarla real aunque `contado=0`) y usar `r["cantidad"]` en el `hincrby`.
5. `_decidir_par`: reasignar `identidades.persona_id→a` en vez de borrar (decisiones duraderas). Si sobra tiempo: `COUNT(a.id)` en `v_calidad`.

## Lo que el README no debe afirmar

No decir "deduplicación de personas confirmada" (los pares cuentan doble y las decisiones se revierten), ni "Splink", ni "robusto ante fallos/concurrente" (sin reentrega ni lock), ni "lee cualquier Excel real" (sin celdas combinadas ni `;`), ni "anónimo"/"cifrado" — es seudonimización con clave compartida y DOB completa en `eira:nac` — ni que las cifras sean "oficiales": hay doble conteo posible por correcciones y por colisiones pendientes.
