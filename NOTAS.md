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
