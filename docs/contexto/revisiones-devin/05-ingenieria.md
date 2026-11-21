El plan tiene 542 líneas; leo el resto para revisar tareas, firmas y pruebas.Revisión leída los tres archivos completos. Respuesta en dos partes: **hechos del repo** y **propuesta**.

## Hechos: contradicciones y huecos

**`shared/types.ts` está desfasado** (la sección "Validado con EIRA" manda):

| Falta / sobra | Detalle |
|---|---|
| `Role` | Dice `'direccion'`; validado es `'presidencia'` (deci. 10) |
| `Campo` | Faltan `idEira`, `curp`, `edad`, `asistencia`: las pruebas de Tarea 2 no compilan |
| `ReglaCalidad` | Faltan `id_invalido`, `colision_id`, `edad_inconsistente`, `curp_invalida` |
| Interfaces | No existen `CalidadArchivo` ni `PlantillaInforme` |
| Comentarios | `personaClave` dice `nf:<hmac>`; hoy es `eira:`/`curp:`/`id:` + sufijo `#n` |
| `certeza` | Tabla de rutas T4 omite `certeza` en `/api/indicadores`; T5 línea 453 la exige |

**`server/claves.ts` — claves ausentes:** `imp:nac` (la exige `edadPromedio` por `HMGET`), huella por fila (ver abajo), `imp:plantillas`, contador de `inasistencias`, e índice inverso persona→conjuntos.

**Huecos de firma/datos:**

- `ingerir(...)` no recibe `nombres`, pero el texto dice que lo recibe. Peor: la colisión *entre archivos* (sembrada) es imposible: `nombres` vive solo en memoria por ingesta y los nombres no pueden persistir en Valkey. Sin `subclave = HMAC(nombre)` en el registro, además, `decidirPar('distinta')` no puede repartir registros entre `#1` y `#2`.
- `ligarFolio` recibe `idEira` pero no `hmacKey`; `edadPromedio` no recibe `fechaCorte`; `calificar` nunca define "completos".
- Pruebas usan `FOLIO_OK`, `CURP_OK`, `ID_CONOCIDO`, `volcar` sin definir; el recorrido dice "cruce de 10 a 11" pero la tabla siembra 15 compartidas; el programa del 3er archivo es ambiguo ("Tamizaje Rosa (nutrición)" rompería el filtro que espera 160); `/ejemplo/i` exige nombres sembrados con "ejemplo" sin decirlo.
- `imp:huellas` (sha256 del archivo) **no cumple** "mismo reporte, distinto nombre": Excel re-guardado cambia los bytes. Hace falta huella por fila normalizada.
- Atomicidad: `SADD imp:huellas` antes del pipeline: si el pipeline falla, el archivo queda marcado y jamás entra. Mover una persona entre conjuntos exige enumerar todos los sets que la contienen: hoy requeriría `SCAN` de `imp:per:*` (O(todo)).

## Opinión: modelo Valkey más simple

- Nunca reescribir conjuntos. `imp:alias` mapea cualquier clave → canónica. Al ingerir, resolver alias (1 `HGET`) y hacer `SADD` solo de la canónica.
- En lectura, `personasUnicas`/`cruce`: `SINTER` (no `SINTERCARD`), `HMGET imp:alias` a los miembros, conteo único en app. Exacto, O(members) — trivial a escala EIRA — y las decisiones (`misma`, `distinta`, ligar folio) cuestan 1 `HSET` + 1 `XADD`, atómicos en `MULTI`.
- `imp:huellafila` Set: huella de fila normalizada; resuelve doble subida con distinto nombre y las 4 filas duplicadas sembradas.
- `imp:mem` se vuelve innecesario (nada se mueve). `imp:nac` se mantiene. Nombres: solo en proceso (Map `eiraHmac→nombre`), repoblado releyendo los archivos fuente (que sí los tienen, en disco).

**Cambios exactos:** en types.ts — `Role`, +4 campos a `Campo`, +4 reglas a `ReglaCalidad`, +`CalidadArchivo`, +`PlantillaInforme`, +`subclave` a `Registro`, corregir comentarios de `personaClave`/`probables`. En claves.ts — +`kNac`, +`kHuellaFila`, +`kPlantilla`, +`kCntInasist`; firmas: `ingerir` +`nombres`, `ligarFolio`/`edadPromedio` +`hmacKey`/`fechaCorte`.

**10 pruebas que más valen:** ① mismo archivo 2× → `nuevo:false`, cifras iguales; ② mismas filas, distinto nombre → dedup por huella de fila; ③ colisión `distinta` reparte registros y probables +1; ④ `ligarFolio` probable→verificada con mínimo intacto; ⑤ sumar unidades distintas → 422; ⑥ cruce tras alias es exacto (SINTERCARD habría inflado); ⑦ fila sin municipio cuenta en total, no en desglose; ⑧ fechas en 3 formatos + serie Excel; ⑨ ninguna clave `imp:*` contiene nombre ni CURP; ⑩ `edad_promedio` contra `esperado.json` con fecha de corte fija.

**Excel real:**

| Problema | Trato |
|---|---|
| Fechas (texto, serial, `cellDates`) | `parseFecha` por tipo detectado; serial si número en rango 20000–60000 |
| Encabezados en fila 2–3 | Elegir la fila con más coincidencias del diccionario; si <60 %, preguntar |
| Celdas combinadas | `xlsx` las deja nulas: forward-fill por columna antes de mapear |
| Hojas múltiples | Hoja con mayor puntaje de encabezado; listar las demás en la vista previa |
| Fila de totales al final | Detectar `total\|subtotal` o ID vacío + numéricos: excluir y cruzar contra la suma (`discrepancia_total`) |
