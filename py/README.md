# Procesamiento en Python

Lee los Excel/CSV que sube el frontend, los lleva a un modelo común, omite duplicados y escribe el
resultado en Valkey. La fuente de verdad de la integración es [`docs/contrato-valkey.md`](../docs/contrato-valkey.md);
este proceso no llama al frontend ni al revés.

## Datos de demostración (ficticios)

`python datos_demo/generar.py` crea en `datos_demo/archivos/`: `tamizaje-rosa.xlsx` (con problemas sembrados), su copia, su re-guardado, otro orden de columnas, CSV y versión nueva; `nutricion.xlsx` (comparte 30 filas, también de Tamizaje Rosa) y `melenas-en-movimiento.xlsx` (40 donaciones y 20 pelucas entregadas; 20 beneficiarias también están en Tamizaje Rosa). Subir Melenas con tipo de registro `donacion`.

## Cómo correrlo

```bash
cd py
pip install -r requirements.txt
export VALKEY_URL=redis://127.0.0.1:6379      # y VALKEY_PASSWORD si aplica
python -m procesador.worker                    # toma trabajos de eira:trabajos y decisiones de eira:decisiones
```

- `EIRA_HMAC_KEY`: llave para los identificadores opacos. Si no se define se genera una en `py/.estado/hmac.key` (fuera de git). **Debe ser la misma entre ejecuciones**: si cambia, cambian los identificadores de persona.
- `EIRA_ESTADO_DIR`: dónde vive la base local (`eira.sqlite`). Por defecto `py/.estado/`.
- Pruebas: `python -m pytest tests` (levanta su propio `valkey-server` o `redis-server` en un puerto libre).
- Archivos de demostración (ficticios): `python datos_demo/generar.py` escribe en `datos_demo/archivos/`.

## Qué hace

1. **Lee** `.xlsx` y `.csv` (UTF-8 o cp1252; `,` `;` tab). Elige la hoja y la fila de encabezados con más coincidencias, rellena celdas combinadas, ignora filas vacías y de totales, entiende fechas de texto, de Excel y número de serie.
2. **Mapea** encabezados heterogéneos a: `id_eira, folio, nombre, fecha_nacimiento, edad, ciudad, servicio, estudio, fecha, asistencia, cantidad` (sinónimos en `procesador/mapeo.py`). Si el encabezado del ID no se reconoce pero una columna trae IDs, la usa. El resultado va a `eira:trabajo:<id>.mapeo` y las columnas sin usar se avisan en `mensaje`.
3. **Calidad**: `faltante`, `fecha_invalida`, `fecha_futura`, `ciudad_desconocida`, `id_invalido`, `edad_inconsistente`, `posible_correccion`, `fila_repetida`, `fila_ya_cargada`. Cada archivo recibe `puntaje` (0 a 100) y `estrellas` (1 a 5) con `motivos`.
4. **Duplicados en tres capas** (ver el plan, sección "Cómo se omiten los duplicados"):
   - Mismos bytes → `identico`. Mismo contenido (re-guardado, otro orden de columnas, CSV) → `mismo_contenido`. No se importa.
   - Misma fila: huella HMAC de `ID | nombre | municipio | servicio | fecha | asistencia | cantidad`. Traslape ≥ 90 % → `version_nueva`; 30 a 89 % → `traslape_parcial`; menos → `distinto`. Las filas ya cargadas se omiten y quedan en `eira:omitidas:<fuente>`; `restituir_fila` las vuelve a contar.
   - Misma persona: mismo ID y mismo nombre → misma persona. Mismo ID con nombre distinto → par en `eira:pares`, cuenta como una hasta que alguien decida (`misma` / `distinta` por `eira:decisiones`).
5. **Programas y tipos de registro** salen de `catalogos/iniciativas.json`; nada va fijo en el código. El trabajo puede traer el id o el nombre del programa (`Tamizaje Rosa` → `tamizaje-rosa`); si no está en el catálogo, o el programa no admite ese tipo de registro, el trabajo termina en `error` con un mensaje claro. Un archivo puede traer una columna "Tipo de registro" que manda sobre la unidad del trabajo (Melenas: donaciones y pelucas en el mismo Excel). Los tipos "de objetos" (trenzas, insumos) suman la cantidad.
6. **Roles**: solo beneficiarias y participantes son personas impactadas (`eira:per:*`). Donantes y voluntarias van aparte, en `eira:don:*`.
7. **Informes**: `eira:met:<programa>` y `eira:met:global` con las métricas precalculadas. El Global suma las personas de cada programa (quien está en dos cuenta dos veces) y avisa cuántas están en más de uno.
8. **Escribe** las claves del contrato como una *proyección* de su base local, en una sola transacción. Cada persona tiene un solo identificador: `p` + 15 hex de `HMAC-SHA256(llave, "id|" + ID canónico)`.

## Decisiones y supuestos (confirmar con EIRA)

- Los encabezados exactos de EIRA son supuestos. Para agregar los reales, editar `SINONIMOS` en `procesador/mapeo.py`.
- ID de EIRA: iniciales + `AAAAMMDD`; se acepta la fecha antes o después de las iniciales y se normaliza a iniciales + fecha.
- Las fechas `dd/mm/aaaa` se leen día primero.
- Una inasistencia no cuenta como atención ni como persona atendida; se suma en `inasistencias`.
- Filas sin ID ni nombre no se deduplican por fila (no hay con qué compararlas) y cuentan en `eira:sinid`.
- Filas con el mismo ID, servicio y día dentro de un archivo se tratan como repetidas. Si EIRA confirma que pueden ser servicios distintos, agregar un folio de estudio a la huella.
- `servicio` del contrato = columna de servicio, o la de estudio si no hay. Municipios: los 125 de Jalisco (INEGI) más `catalogos/ciudades_extra.txt`; los demás quedan como `ciudad_desconocida` y se escriben vacíos.
- `unidad` la define quien sube el archivo; `cantidad` solo se suma en `entrega_insumo`.
- Se deduplica entre programas y dentro del mismo programa por igual (pendiente de confirmar).
- La edad promedio se calcula a la fecha de corte más reciente del programa, solo con personas que tienen fecha de nacimiento (`edad_n` dice cuántas). En el Global promedia cada pareja persona-programa, coherente con que el total sume.
- `eira:archivo:<id>` (el archivo crudo, con nombres) lo escribe el frontend y caduca en 1 h. Para reducir exposición se podría borrar al terminar el trabajo; hoy no lo hago porque el contrato no lo pide.

## Límites y diferencias con el contrato

- **Estado local**: `py/.estado/eira.sqlite` guarda lo que no puede ir a Valkey (nombre normalizado, para comparar variantes). Es información personal: en un piloto real requiere cifrado en reposo y respaldo. Valkey se reconstruye completo desde esa base.
- Este proceso es dueño de `eira:per:*`, `eira:cnt:*`, `eira:sinid`, `eira:nac`, `eira:valores:*`, `eira:fuente(s)`, `eira:anom:*`, `eira:omitidas:*` y `eira:pares`. Al procesar el primer archivo reemplaza lo que hubiera ahí, incluida la semilla de demostración (`npm run limpiar` antes de una corrida real).
- `eira:fuente:<id>.filas_omitidas` incluye las repetidas dentro del archivo; el hash del trabajo las separa en `filas_omitidas` y `filas_repetidas`.
- Un solo trabajador a la vez. No hay conteos aproximados: todo es exacto.

## Implementado y simulado

| Implementado | Simulado o pendiente |
|---|---|
| Lectura, mapeo, calidad, duplicados, pares, restituir fila, catálogo de programas, roles, métricas por informe y Global, proyección a Valkey, pruebas con datos ficticios | Encabezados reales de EIRA; cifrado en reposo; respaldo; mapeo confirmado por la usuaria en pantalla; reemplazo de una versión por otra |
