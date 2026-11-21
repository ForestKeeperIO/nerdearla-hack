# NOTAS — base de Valkey (rama valkey-base)

## Cómo se usa

```bash
VALKEY_PORT=6391 npm run valkey      # levanta Valkey local (binario oficial 9.2.0)
VALKEY_URL=redis://127.0.0.1:6391 npm run semilla
VALKEY_URL=redis://127.0.0.1:6391 npm run verificar
npm test                             # usa el puerto 6391, base 15
```

En el 6379 corre la instancia de otro equipo: no tocarla. Las pruebas usan la
base 15 del 6391 para no mezclarse con la base de demostración (base 0).

## Salida de `npm run verificar` (con la semilla cargada)

```
OK     eira:contrato existe y vale 1                      valor=1
OK     suma de eira:cnt:atencion = 160                    suma=160
OK     suma de eira:cnt:participacion = 80                suma=80
OK     per:programa:Tamizaje Rosa ⊆ per:todas             90 miembros, 0 fuera
OK     per:programa:Salud que Florece ⊆ per:todas         75 miembros, 0 fuera
OK     per:programa:Nutrición ⊆ per:todas                 40 miembros, 0 fuera
OK     SINTERCARD Tamizaje Rosa ∩ Salud que Florece = 15  cruce=15
OK     ningún valor contiene nombres completos ficticios  50 claves revisadas
OK     cada fuente de eira:fuentes tiene su hash          3 fuentes

Todo el contrato en orden.
```

## Bloqueos y pendientes

- `py/ejemplo_worker.py` queda sin ejecutar: `python3` no tiene el paquete
  `valkey` (`ModuleNotFoundError`) y por las reglas no se instala pip. En la
  máquina del equipo de procesamiento: `pip install valkey`.
- `compose.yaml` no se probó: esta máquina no tiene Docker (indicado en la tarea).

## Decisiones de la semilla (no son cambios al contrato)

- Los 20 registros sin identificar (`eira:sinid`) son además de los conteos:
  12 en Tamizaje Rosa y 8 en Salud que Florece. Por eso `filas` de cada fuente
  (132 y 88) es mayor que sus conteos identificados (120 y 80).
- Hay 4 trabajos y 3 fuentes: `tr-004` (`tamizaje-rosa-v2.xlsx`, listo con
  `nivel_duplicado=version_nueva`) no crea fuente propia; apunta a
  `fuente_original=f-tamizaje-rosa`. Las 8 filas "agregadas" no alteran los
  conteos de la semilla para mantener los invariantes (160/80).
- Identificadores de persona opacos: `p` + 15 hex de SHA-256 de una semilla
  fija. Etiquetas de pares: solo iniciales, ciudad y edad.

---

# NOTAS — motor en Python (rama motor)

## Cómo se usa

```bash
uv sync                                        # una vez
VALKEY_PORT=6391 npm run valkey                # Valkey de pruebas (el 6379 es de la app)
VALKEY_URL=redis://127.0.0.1:6391/15 \
IMPACTO_DB=/tmp/impacto.sqlite \
IMPACTO_HMAC_KEY=<clave> bash scripts/arrancar-motor.sh   # worker en primer plano
VALKEY_URL=redis://127.0.0.1:6391/15 uv run python scripts/procesar_local.py \
    reportes/tamizaje-rosa.xlsx --programa "Tamizaje Rosa" --unidad atencion \
    --fecha-corte 2026-09-30
uv run pytest                                  # 24 pruebas
```

Variables: `VALKEY_URL` (con número de base), `VALKEY_PASSWORD` (opcional),
`IMPACTO_DB`, `IMPACTO_HMAC_KEY`. Nada de rutas ni puertos fijos en el código.
`verificar.ts` acepta `VERIFICAR_ATENCION`, `VERIFICAR_PARTICIPACION` y
`VERIFICAR_CRUCE` (por defecto los de la semilla: 160, 80, 15).

## Verificación de los siete archivos (Valkey limpio, db 15 del 6391)

Worker + `procesar_local.py`, en este orden. Estado/nivel/mensaje quedaron en
`eira:trabajo:<id>`:

| Archivo | Estado | nivel_duplicado | Mensaje |
|---|---|---|---|
| tamizaje-rosa.xlsx | listo | distinto | Se agregaron 126 filas. 4 filas repetidas dentro del archivo: se cuentan una vez. |
| salud-que-florece.xlsx | listo | distinto | Se agregaron 84 filas. |
| nutricion.xlsx | listo | traslape_parcial | Comparte 30 filas con 'tamizaje-rosa.xlsx'. Se cuentan una sola vez. Revísalas en Calidad si eran servicios distintos. |
| reporte_final_2.xlsx | duplicado | identico | Este archivo ya se cargó el 21 nov como 'tamizaje-rosa.xlsx'. No se vuelve a cargar. |
| tamizaje-rosa-reguardado.xlsx | duplicado | mismo_contenido | Mismo contenido que 'tamizaje-rosa.xlsx' (archivo vuelto a guardar o exportado). No hay nada nuevo. |
| tamizaje-rosa.csv | duplicado | mismo_contenido | Mismo contenido que 'tamizaje-rosa.xlsx' (archivo vuelto a guardar o exportado). No hay nada nuevo. |
| tamizaje-rosa_v2.xlsx | listo | version_nueva | Parece una versión nueva de 'tamizaje-rosa.xlsx': 126 filas ya estaban y se omiten; se agregan 8. |

Totales en SQLite tras los siete (coinciden con `reportes/esperado.json`
`globales.totales_finales`):

| Métrica | SQLite | esperado.json |
|---|---|---|
| Atenciones (`sum(cantidad)`, `contado=1`) | 138 | 138 |
| Participaciones | 80 | 80 |
| Personas | 181 | 181 |
| Pares pendientes | 5 | 5 |

En Valkey: `SCARD eira:per:todas`=181, `SINTERCARD` Tamizaje Rosa ∩ Salud que
Florece = 15, suma de `eira:cnt:atencion` = 138, `HLEN eira:pares` = 5.

## Splink: en respaldo

Quedó **respaldo**, no activo: la vinculación usa reglas exactas (mismo ID y
mismo nombre normalizado → misma persona) más rapidfuzz para proponer pares
(mismo ID con nombre distinto → par pendiente; la similitud se guarda como
`probabilidad`). Lo que faltó para Splink: tiempo de diseño de su modelo de
comparación (bloqueos por ID y fecha de nacimiento, comparaciones de nombre)
y — más de fondo — Splink necesita los datos en claro dentro del proceso y
un umbral calibrado; con ~200 filas la regla exacta cubre todos los casos
sembrados. La dependencia `splink` queda instalada para el piloto.

## Decisiones de diseño

- Huella de fila: HMAC(`id|nombre_norm|municipio_clave|servicio|fecha|asistio|cantidad`)
  con `IMPACTO_HMAC_KEY`. No incluye programa ni unidad: el traslape entre
  coordinaciones se detecta. `eira:huellas:{archivo,contenido,fila}` (nuevas
  claves; falta asentarlas en `docs/contrato-valkey.md`).
- Las huellas se registran al final del MULTI de Valkey y la fuente en SQLite
  lleva `huella_bytes UNIQUE`: una caída a media carga no marca el archivo y
  un reintento lo reporta como idéntico en vez de reimportar.
- Inasistencias: `contado=1`, `cantidad=0` (conservan su huella, no suman).
- `identidades` (clave HMAC del ID o del folio + HMAC del nombre) resuelve a
  persona sin guardar el ID ni el nombre en claro. Los nombres viven solo en
  RAM del proceso para comparar variantes; tras reinicio el motivo del par
  sale genérico pero el par se genera igual.
- Reportes sin ID ni nombre: se importan por filas (cantidad = primera
  columna numérica), cuentan en `eira:sinid`, `persona_id` nulo.
- `filas_nuevas` del trabajo cuenta filas únicas (126 en tamizaje: 130 menos
  4 repetidas internas).

## Bloqueos resueltos en el camino

- El paquete `py` de site-packages sombreaba `py/` en pytest: conftest saca
  el módulo de `sys.modules` y antepone el repo a `sys.path`.
- `xreadgroup` con `block` necesita `socket_timeout` mayor (15 s) y tolerar
  `TimeoutError` en el ciclo.
- `eira:archivo:*` trae bytes: se lee con un cliente aparte
  (`decode_responses=False`); el de texto lo rompería.

## Pendientes

- Asentar `eira:huellas:{archivo,contenido,fila}` en `docs/contrato-valkey.md`
  (commit propio a `main`, avisando al frontend).
- `edad_inconsistente` está implementada pero no se ejercita en los datos.
- `posible_correccion` (fila casi igual con un campo distinto) está en las
  reglas pero sin detección aún.

---

# NOTAS — Metabase (rama metabase, Tarea 4)

## Estado

- Metabase OSS **v0.65.6** corriendo en http://127.0.0.1:3200 (JAR en `.metabase/`,
  base interna `.metabase/metabase.db.mv.db`, bitácora `.metabase/metabase.log`,
  credenciales generadas en `.metabase/credenciales.json` — todo ignorado por git).
- Tableros públicos (datos ficticios, base `data/impacto.sqlite`):
  - Impacto: http://127.0.0.1:3200/public/dashboard/f62686a5-b630-4c72-948a-502228267c11
  - Calidad: http://127.0.0.1:3200/public/dashboard/f0b06799-74ef-4c7a-8485-ee1f4840c4a9
  - Entorno `blanco` (base vacía) en `metabase/enlaces.json` → `entornos.blanco`.
- **Iframe: permitido** (`frame-ancestors *`, sin `X-Frame-Options`; verificado
  con una página servida desde otro puerto).
- Pruebas: `uv run --with requests,pytest pytest metabase/test_metabase.py` → 5/5.

## Detener / reiniciar

```bash
pkill -f '.metabase/metabase.jar'
bash metabase/arrancar.sh   # espera a /api/health; primera vez ~1-2 min
```

## Pendientes / avisos

- `metabase/esquema_prueba.sql` es TEMPORAL. Cuando `origin/motor` traiga
  `db/esquema.sql`: reconstruir `data/impacto.sqlite` con ese esquema y
  reprovisionar (`--entorno real --db <ruta>`). La vista `v_calidad` debe
  exponer `filas_omitidas`/`filas_nuevas` y hace falta `v_pares_pendientes`
  (ver metabase/README.md).
- Metabase tarda ~90 s en arrancar la primera vez (migraciones Liquibase).
- Al ponerlo detrás de un túnel: `METABASE_URL_PUBLICA=<url del túnel>` y
  reprovisionar para que los enlaces públicos usen esa dirección.

---

# NOTAS — rama fe (frontend y tableros)

## Habilidades instaladas (paso 1)

- `npx modern-web-guidance@latest install` funcionó a la primera. Instalada en
  `.agents/skills/modern-web-guidance/` (con symlink para Claude Code).
- `npx skills add nutlope/hallmark` funcionó a la primera. Instalada en
  `.agents/skills/hallmark/` (`skills-lock.json` en la raíz quedó actualizado).

## Dirección visual (Hallmark, modo app screen + fast mode)

- Alcance: pantalla de aplicación ("app screens"), género modern-minimal.
- Tema repartido y elegido: **Coral** (2/3, seed herramienta-interna-para-ong-6f3a·c50cad20·2026-11-21·r0):
  papel gris cálido, superficies de algodón, un solo acento para acción/selección/estado.
- El acento del tema se corrió de coral a **rosa** (oklch hue 8): requisito explícito de EIRA
  ("rosa como acento, no como fondo").
- `theme.mjs scaffold coral --scope app` escribió `web/app/tokens.css` y `web/app/base.css`;
  se quitaron de `base.css` las reglas `[data-slot]` (chocaban con la convención de shadcn/ui).
- Stamp Hallmark en la primera línea de `web/app/globals.css`.

### Las 5 reglas que más cambiaron el diseño

1. Todo color y fuente pasa por tokens en `:root` — nada de literales fuera del bloque
   (`tokens.css` + mapeo a variables shadcn en `globals.css`).
2. Densidad de app: controles de 44 px, tablas antes que tarjetas, estado en la URL
   (los filtros del tablero viven en `?programa=…&ciudad=…`).
3. Cada región con datos tiene cuatro estados (cargando, vacío con qué hacer, error, lleno):
   los estados vacíos de trabajos, fuentes, calidad y tablero dicen qué hacer ahora.
4. Estado con texto además de color: las marcas `.estado` llevan rótulo escrito
   ("Listo: versión nueva", "Duplicado: idéntico"), nunca solo un punto de color.
5. Firma obligada de la herramienta: la lista viva de trabajos (refresco 2 s) y el
   desplegable "Cómo se calculó" con el comando de Valkey y los ms en cada cifra.

Modern Web Guidance: se usó para confirmar patrones (dialog/details nativo para el
desplegable, `:focus-visible`, `prefers-reduced-motion`, impresión). Ver sección
"Modern Web Guidance" al final de esta nota.

## Decisiones y supuestos

- Subida por ruta `POST /api/subir` (multipart) en vez de acción de servidor:
  las server actions tienen límite de 1 MB de cuerpo y los archivos llegan a 10 MB.
  Mismo efecto en Valkey: `SET eira:archivo:<id> EX 3600`, `HSET eira:trabajo:<id>`
  pendiente, `XADD eira:trabajos`.
- `decision` para `restituir_fila` se escribe como `restituir` (el contrato solo
  nombra `misma|distinta`, que aplican a `persona`). Avisado por si Python espera otro valor.
- Fecha de corte del tablero: la más reciente de las fuentes; hoy si no hay ninguna.
- En `eira:decisiones` el campo `por` se llena con el rol ("Presidencia"/"Coordinación").

## Bloqueos / pendientes

- El benchmark de 21st.dev/details.so (`…/devin2/out/c.md`) todavía no existe a esta hora
  (solo `c.tmp`; el proceso que lo genera está atorado en permisos). Se revisó de nuevo
  al terminar el paso 3: sigue sin existir.

## Rehecho de la capa visual (segunda sesión, misma fecha)

- El dueño no aprobó el tema Coral de Hallmark. Nueva dirección: recrear los
  componentes del benchmark (`docs/contexto/benchmark-ui.md`, traído con
  `git merge origin/main`) con aspecto sobrio: fondo stone-50, tarjetas blancas
  con borde 1 px, radio 10 px, sombra casi nula, rosa `#be185d` solo como acento,
  Inter + IBM Plex Mono, cifras tabulares.
- La lógica no cambió: `web/lib/` (claves, valkey, datos, acciones, rol, folio),
  rutas API y el flujo Subir → Calidad → Vista previa → Exportar se conservan.
- Componentes: sidebar oficial shadcn **copiado tal cual** del registro (MIT) con
  sheet/tooltip/use-mobile (radix-ui); stepper, stat-card, star-rating,
  comparison, bar-list, alert-banner y file-upload **reimplementados** (el código
  de 21st.dev no es visible sin API key y varios declaran `no-license`/`unknown`
  o dan 404). Empty y sonner: fuente oficial shadcn (MIT). Tabla completa con
  licencias en `web/TERCEROS.md`.
- Dependencias nuevas: radix-ui, sonner, next-themes, react-dropzone,
  @tanstack/react-table (fijada en 8.x: la v9 trae otra API y rompe el patrón
  shadcn data-table).
- Se eliminaron `components/barras.tsx` (Recharts sustituida por BarList) y
  `components/cabecera.tsx` (sustituida por sidebar + stepper).
- Auditoría Hallmark (sloplint, scope app): 3 FAIL propios corregidos (guión en
  copia, literal de color fuera de tokens, "VS" con tracking). Quedan 4 FAIL 10a
  dentro de `components/ui/sidebar.tsx`: son clases del código upstream copiado
  tal cual (transiciones deliberadas del sidebar); se reportan, no se tocan.
  Gate 20 (stamp Hallmark) reportado: esta iteración no salió de un scaffold
  Hallmark, poner el sello sería atribución falsa.
- Ojo: `next start` sirve el build de cuando arrancó; tras `npm run build` hay
  que reiniciarlo o las capturas salen sin CSS.
