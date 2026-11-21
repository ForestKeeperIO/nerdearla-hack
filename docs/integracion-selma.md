# Integración con el procesador de Selma

> Análisis de solo lectura hecho por un agente el 21 nov, 14:20 CDMX, sobre `origin/soe_python` en `3435ded`. La rama siguió avanzando después (14:25: `13a806d`); lo posterior no está revisado. No se desplegó su código ni se cambió el nuestro: la decisión es de Ian.


Alcance: solo lectura sobre `origin/soe_python` (3435ded, 21 nov 14:13), exportado a un directorio temporal fuera del repositorio. No toqué el repositorio ni ningún servicio.

## 1. Verificado

| Qué | Comando | Resultado |
|---|---|---|
| Cambios de la rama | `git diff --stat origin/main...origin/soe_python \| tail` | `31 files changed, 2051 insertions(+), 84 deletions(-)`: `py/procesador/` (12 archivos), `py/datos_demo/`, `py/subir_demo.py`, `py/tests/test_flujo.py`, `test_texto.py`, y reescribe `py/tests/conftest.py` |
| Commits | `git log origin/soe_python --not origin/main` | 5 commits de sortegae (a07998d, 83b34b3, f44e70b, e8762e3, 3435ded) |
| Sus pruebas, tal cual | `uv run --no-project --with-requirements requirements.txt --with pytest python -m pytest tests/test_flujo.py tests/test_texto.py -q` | `4 passed, 3 skipped`: su fixture arranca un `valkey-server` propio y no hay ninguno en el PATH |
| Sus pruebas contra 6392 | mismo comando, tras cambiar en mi copia el fixture `v` a `port=6392, db=10` con `flushdb` | `7 passed in 4.54s`; la base 10 quedó en 0 claves |

No corrí `test_motor.py` (nuestro) dentro de su rama.

## 2. Streams y grupos (leído en código)

| | Motor (nuestro) | Procesador (Selma) |
|---|---|---|
| Streams | `eira:trabajos`, `eira:decisiones` | los mismos |
| Grupo | `procesadores` | `procesadores` (el mismo) |
| Consumidor | `py-<pid>` | `py-1` (`EIRA_CONSUMIDOR`) |
| Reintentos | reclama pendientes con `min_idle_time` y marca error tras varios intentos | relee solo sus pendientes al arrancar; no reclama los de otro consumidor |
| SQLite | `IMPACTO_DB` (`data/impacto.sqlite`, `db/esquema.sql`) | `py/.estado/eira.sqlite` (`EIRA_ESTADO_DIR`) |
| Escritura | incremental (`HINCRBY`, `SADD`) | borra y reescribe todo lo derivado en un `MULTI` por cada trabajo o decisión |

## 3. Clave por clave

| Clave | Contrato | Motor | Selma | Diferencia |
|---|---|---|---|---|
| `eira:trabajo:<id>` `estado` | procesando, listo, duplicado, error | igual | igual | ninguna |
| `mensaje`, `nivel_duplicado`, `fuente`, `fuente_original`, `filas*`, `mapeo`, `terminado_en` | sí | sí | sí | campos del motor uno a uno: SIN VERIFICAR |
| `eira:archivo:<id>` | lo escribe el frontend, 1 h | lo lee y lo borra al terminar | lo lee y no lo borra | el crudo con nombres queda hasta 1 h |
| `eira:fuentes`, `eira:fuente:<id>` | sí | sí | sí, con los campos del contrato | puntaje del zset: ella usa la hora de carga guardada |
| `eira:anom:*`, `eira:omitidas:*` | sí | sí | sí | sus `filas_omitidas` incluyen repetidas internas |
| `eira:per:todas`, `per:programa`, `per:ciudad`, `per:periodo`, `per:servicio` | todas las personas | incluye donantes | solo impactadas | cambia el significado |
| `eira:per:certeza:<nivel>` | sí | sí | sí | ninguna |
| `eira:per:impactadas:<prog>` | sí | sí | no | falta, y su borrado de `eira:per:*` elimina las nuestras |
| `eira:per:donantes:<prog>` | sí | sí | no; usa `eira:don:programa:<prog>` y `eira:don:todas` | nombre fuera de contrato |
| `eira:per:tipo:<tipo>` | no (propuesta del frontend) | no | no | el frontend cae a `per:programa` |
| `eira:nac`, `eira:sinid`, `eira:cnt:<unidad>`, `eira:valores:*` | sí | sí | sí | ella no escribe `valores:estado` |
| `eira:presencia:<alcance>` | sí | sí | no | falta |
| `eira:pares` | sí | sí, `HSETNX` | sí, misma forma JSON | ids de par e ids de persona distintos entre motores |
| `eira:huellas:archivo`, `huellas:fila` | sí | sí | no; las guarda en su SQLite | no ve duplicados de lo que cargó el motor |
| `eira:met:<prog>`, `eira:met:global` | no | no | sí | añadido suyo; el frontend no lo lee |
| `eira:bitacora`, `eira:eventos`, `eira:contrato` | sí | sí | sí | ella pone `contrato` sin `NX` |
| Decisiones `persona`, `restituir_fila` | sí | sí | sí | equivalentes |

## 4. Consumidores

| Lector | Lee | ¿Lo cubre Selma? |
|---|---|---|
| `web/lib/datos.ts`: trabajos, fuentes, anomalías, omitidas, pares, bitácora | claves comunes | Sí |
| `datos.ts`: filtros, conteos, edad (`valores`, `cnt`, `nac`, `sinid`, `perCerteza`) | comunes | Sí |
| `impactadasIdsDe` y `noImpactadasIdsDe` (vista previa del informe) | `per:tipo:*`, o si no `per:programa` | Parcial: impactadas correctas; las donantes saldrían en 0, porque están en `eira:don:*` (inferido) |
| `web/lib/territorio.ts` | `eira:presencia:<alcance>` | No: mapa vacío |
| Metabase (`metabase/provisionar.py`) | vistas `v_global`, `v_conteos`, `v_personas_por_programa`, `v_objetos`, `v_presencia`, `v_presencia_municipios`, `v_calidad`, `v_edad`, `v_cruce_programas`, `v_pares_pendientes` | No: su `eira.sqlite` tiene 4 tablas (`fuentes`, `filas`, `anomalias`, `pares`) y ninguna vista |

## 5. Conclusiones

**(a) Si corriera el suyo en lugar del nuestro**
- Se rompe: el mapa de presencia, las donantes en el informe y todo Metabase, que se queda sin datos nuevos.
- Se pierde: el borrado del archivo crudo y la reconstrucción desde `IMPACTO_DB`.
- Se gana: métricas precalculadas en `eira:met:*`, un catálogo que rechaza programa o tipo inválido con mensaje claro, lectura de CSV y datos de demostración con valores esperados.

**(b) Los dos a la vez en el mismo Valkey**
- Mismo grupo (situación actual del código): cada trabajo le toca a uno solo, al azar. Como ella borra `eira:per:*`, `eira:cnt:*`, `eira:fuente:*` y `eira:pares` en cada proyección, eliminaría lo escrito por el motor. Su README lo advierte ("un solo trabajador a la vez").
- Grupos distintos: ambos procesan cada trabajo y cada decisión, con doble escritura, dos ids de fuente y de persona, y el mismo borrado.
- No deben compartir base de Valkey.

**(c) Caminos, de menor a mayor esfuerzo**

| Opción | Minutos | Riesgo |
|---|---|---|
| 1. Mantener el motor en la demo y documentar el suyo (esta tabla) | 10 | Ninguno técnico |
| 2. Correr el suyo en otra base de Valkey con `EIRA_ESTADO_DIR` propio y comparar cifras con `subir_demo.py` | 30 a 45 | Bajo. Ojo: la fusión de la rama reescribe `py/tests/conftest.py` y puede romper `test_motor.py` (inferido) |
| 3. Adaptar nombres: que ella escriba `per:donantes`, `per:impactadas`, `presencia` y `huellas`, o portar al motor su `eira:met:*` y su catálogo | 90 a 180 | Alto antes de la demo; Metabase sigue sin cubrirse en la primera dirección |

**(d) Preguntas abiertas**
- Selma: ¿`eira:per:todas` debe excluir donantes? Eso cambia el contrato.
- Selma: ¿aceptaría `eira:per:donantes:<prog>` en vez de `eira:don:*`?
- Selma: ¿quién iba a leer `eira:met:*`?
- Selma: ¿piensa escribir presencia?
- Ian: ¿el total Global es la suma por programa (su regla y la de la vista previa) o personas únicas?
- Ian: ¿Metabase es parte obligatoria de la demo?
- Ian: ¿se fusiona `soe_python` a `main` antes o después de la demo?

SIN VERIFICAR: comportamiento real del frontend con sus datos (no levanté nada), campos de `eira:trabajo` del motor uno a uno, y el efecto de la fusión sobre nuestras pruebas.
