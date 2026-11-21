# Contrato de Valkey · versión 1

> Adiciones del 21 nov, 13:00 (no rompen compatibilidad): `eira:informe:<alcance>` y las tres claves `eira:huellas:*`. Cada entorno (en blanco, con fuentes reales) usa un número de base distinto de Valkey, indicado en `VALKEY_URL`.

Valkey es el único punto de contacto entre el **procesamiento en Python** (leer Excel, deduplicar, unificar programas) y el **frontend** (subir archivos, tableros, calidad, informe). Ninguno llama al otro: los dos leen y escriben estas claves.

- Prefijo de todas las claves: `eira:`
- Separador de campos compuestos: `|`
- Fechas: `AAAA-MM-DD`. Periodos: `AAAA-MM`. Marcas de tiempo: ISO 8601 en UTC.
- En Valkey no van nombres completos, teléfonos ni el ID de EIRA en claro. El identificador de persona es opaco (lo define Python; por ejemplo un HMAC).
- La base arranca vacía: `npm run valkey` solo la levanta. Los datos de demostración se cargan aparte con `npm run semilla` y se borran con `npm run limpiar`.
- Conexión: `VALKEY_URL` (por defecto `redis://127.0.0.1:6379`) y `VALKEY_PASSWORD`.

## Flujo

```
Frontend                         Valkey                              Python
   │  1 guarda el archivo  ───►  eira:archivo:<trabajo>  (1 h)
   │  2 encola el trabajo  ───►  eira:trabajos (Stream)   ───►  3 lo toma (grupo "procesadores")
   │                             eira:trabajo:<id>        ◄───  4 va escribiendo el estado
   │                             eira:fuente:<id>, eira:per:*, eira:cnt:*, eira:anom:*, …  ◄── 5 resultados
   │  6 se entera en vivo  ◄───  eira:eventos (Pub/Sub)   ◄───  7 avisa que terminó
   │  8 decisión humana    ───►  eira:decisiones (Stream) ───►  9 la aplica y vuelve a escribir
```

## Lo que escribe el frontend

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:archivo:<trabajoId>` | String binario, caduca en 3600 s | Los bytes del archivo subido |
| `eira:trabajos` | Stream | Un mensaje por archivo: `id`, `nombre`, `programa`, `unidad`, `fecha_corte`, `por` |
| `eira:trabajo:<trabajoId>` | Hash | Al encolar: `estado=pendiente`, `nombre`, `programa`, `unidad`, `fecha_corte`, `por`, `creado_en` |
| `eira:decisiones` | Stream | `tipo` (`persona` o `restituir_fila`), `par` o `fuente` + `fila`, `decision` (`misma` o `distinta`), `por` |

`unidad` es una de: `atencion`, `estudio`, `participacion`, `entrega_insumo`.

## Lo que escribe Python

### Estado del trabajo

`eira:trabajo:<trabajoId>` (Hash), mismos campos más:

| Campo | Valores |
|---|---|
| `estado` | `procesando`, `listo`, `duplicado`, `error` |
| `mensaje` | Texto para la persona, en español. Ejemplo: `Este archivo ya se cargó el 21 nov como 'rosa.xlsx'.` |
| `nivel_duplicado` | `identico`, `mismo_contenido`, `version_nueva`, `traslape_parcial`, `distinto` |
| `fuente` | Id de la fuente creada (vacío si no se importó) |
| `fuente_original` | Id de la fuente con la que coincide, si aplica |
| `filas`, `filas_nuevas`, `filas_omitidas`, `filas_repetidas` | Enteros |
| `mapeo` | JSON: lista de `{ "encabezado", "campo", "probabilidad" }` |
| `terminado_en` | Marca de tiempo |

### Fuentes (archivos ya importados)

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:fuentes` | Sorted Set | miembro = id de fuente, puntaje = segundos Unix de carga |
| `eira:fuente:<id>` | Hash | `nombre`, `programa`, `unidad`, `fecha_corte`, `cargada_en`, `por`, `filas`, `filas_nuevas`, `filas_omitidas`, `inasistencias`, `estrellas` (1 a 5), `puntaje` (0 a 100), `motivos` (JSON: lista de textos) |
| `eira:anom:<fuenteId>` | List | Un JSON por problema: `{ "fila", "regla", "campo", "detalle" }`. `detalle` sin nombres |
| `eira:omitidas:<fuenteId>` | List | Un JSON por fila omitida: `{ "fila", "ya_en_fuente", "ya_en_fila" }` |

Reglas (`regla`): `faltante`, `fecha_invalida`, `fecha_futura`, `ciudad_desconocida`, `id_invalido`, `edad_inconsistente`, `fila_repetida`, `fila_ya_cargada`, `posible_correccion`.

### Personas

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:per:todas` | Set | Todos los identificadores de persona |
| `eira:per:programa:<programa>` | Set | Personas con al menos un registro en ese programa |
| `eira:per:ciudad:<ciudad>` | Set | Ídem por ciudad |
| `eira:per:periodo:<AAAA-MM>` | Set | Ídem por mes |
| `eira:per:servicio:<servicio>` | Set | Ídem por servicio |
| `eira:per:certeza:<nivel>` | Set | `folio`, `id` |
| `eira:nac` | Hash | identificador de persona → fecha de nacimiento |

El frontend calcula personas únicas con `SCARD` y los filtros y cruces con `SINTERCARD` sobre estos conjuntos. Por eso cada persona debe aparecer con **un solo identificador** en todos: la deduplicación de personas la resuelve Python antes de escribir.

### Conteos

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:cnt:<unidad>` | Hash | campo `<programa>\|<ciudad>\|<AAAA-MM>\|<servicio>` → cantidad |
| `eira:sinid` | Hash | mismo campo → registros sin persona identificada |
| `eira:valores:<dimension>` | Set | Valores vistos de `programa`, `ciudad`, `periodo`, `servicio` (llenan los filtros) |

Un valor desconocido se escribe como cadena vacía en su posición del campo.

### Decisiones pendientes y bitácora

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:pares` | Hash | id de par → JSON `{ "id", "estado", "motivo", "a": { "fuente", "fila", "etiqueta" }, "b": { … } }` |
| `eira:bitacora` | Stream | `en`, `por`, `tipo`, `detalle`. Nunca se recorta |

`estado`: `pendiente`, `misma`, `distinta`. `etiqueta` es el texto que se muestra para reconocer a la persona; recomendado iniciales, ciudad y edad, no el nombre completo.

### Presencia territorial

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:presencia:<alcance>` | Hash | clave de municipio de INEGI (5 dígitos) → número de registros. `<alcance>` es el id del programa o `global` |

El trabajo que encola el frontend lleva además el campo `estado_clave` (2 dígitos; por defecto `14`, Jalisco), para resolver las ciudades del archivo. El catálogo de municipios está en `publicos/municipios_mexico.json`.

### Memoria de duplicados (solo la usa Python)

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:huellas:archivo` | Hash | sha256 de los bytes → id de fuente |
| `eira:huellas:contenido` | Hash | huella canónica del contenido → id de fuente |
| `eira:huellas:fila` | Hash | huella de fila → `<fuente>:<fila>` donde se contó |

### Aviso en vivo

`PUBLISH eira:eventos <json>` con `{ "tipo": "trabajo" | "fuente" | "persona", "id": "…" }` cada vez que cambie algo que el tablero deba refrescar.

## Lo que carga el frontend por su cuenta

| Clave | Tipo | Contenido |
|---|---|---|
| `eira:den:mujeres_25_64` | Hash | ciudad → mujeres de 25 a 64 años (INEGI, Censo 2020; `publicos/`) |
| `eira:contrato` | String | `1` |
| `eira:informe:<alcance>` | Hash | Estado de cada informe: `fecha_corte`, `creado_en`, `calidad_resuelta` (0 o 1), `cifras_aprobadas` (0 o 1). `<alcance>` es el id de un programa (`tamizaje-rosa`, `salud-que-florece`) o `global`. Solo lo usa el frontend |

## Ejemplo mínimo en Python

```python
import json, os, time
import valkey  # pip install valkey

v = valkey.Valkey.from_url(os.environ.get("VALKEY_URL", "redis://127.0.0.1:6379"),
                           password=os.environ.get("VALKEY_PASSWORD"), decode_responses=False)

try:
    v.xgroup_create("eira:trabajos", "procesadores", id="0", mkstream=True)
except valkey.ResponseError:
    pass  # el grupo ya existe

while True:
    lote = v.xreadgroup("procesadores", "py-1", {"eira:trabajos": ">"}, count=1, block=5000)
    for _, mensajes in lote or []:
        for msg_id, campos in mensajes:
            t = campos[b"id"].decode()
            contenido = v.get(f"eira:archivo:{t}")            # bytes del Excel
            v.hset(f"eira:trabajo:{t}", mapping={"estado": "procesando"})
            # … leer, deduplicar, unificar, y escribir eira:fuente:*, eira:per:*, eira:cnt:* …
            v.hset(f"eira:trabajo:{t}", mapping={"estado": "listo", "mensaje": "Se agregaron 120 filas.",
                                                 "terminado_en": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
            v.publish("eira:eventos", json.dumps({"tipo": "trabajo", "id": t}))
            v.xack("eira:trabajos", "procesadores", msg_id)
```

## Cambios al contrato

Cualquier cambio se hace primero en este archivo, en un commit propio a `main`, y se avisa al otro lado. El número de `eira:contrato` sube cuando un cambio rompe compatibilidad.
