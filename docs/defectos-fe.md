# Defectos del frontend encontrados con las pruebas e2e

Fecha: 2026-11-21 (~13:45). Rama `fe-e2e`. Pruebas en `web/e2e/` con Playwright
sobre Chromium real, servidor propio en el puerto 3120, Valkey base 7,
`ENTORNO=blanco`.

## Media — `npm run build` falla en un clon limpio (corregido)

- **Pasos:** `cd web && npm ci && npm run build`.
- **Esperado:** compila.
- **Obtenido:** `error TS2307: Cannot find module 'vitest'` en
  `lib/recorrido.test.ts`, `lib/sin-rosa.test.ts`, `lib/star-rating.test.tsx`:
  las pruebas unitarias importan `vitest` pero no está en `devDependencies`,
  y el type-check del build las incluye.
- **Corrección aplicada:** `vitest` agregado a `devDependencies` (commit aparte).

## Media — El pie de Calidad no se entera de las decisiones ya tomadas (falla la prueba)

- **Pasos:** con la semilla cargada, entrar a `/informe/tamizaje-rosa/calidad` y
  pulsar los botones de "¿Es la misma persona?" hasta agotar los 3 pares.
- **Esperado:** cuando el componente muestra "No quedan casos por decidir", el
  botón del pie pasa a "Continuar a Vista previa" y desaparece la nota "Cada
  par sin decidir cuenta como una sola persona".
- **Obtenido:** el botón sigue diciendo "Continuar con 3 por decidir" y la nota
  sigue visible, en contradicción con el componente de arriba. El botón sí
  funciona (escribe `calidad_resuelta=1` y redirige), pero la etiqueta miente:
  la usuaria ya decidió todo y la pantalla le advierte lo contrario.
- **Causa probable:** `paresPendientes` se calcula en el servidor
  (`web/app/informe/[alcance]/calidad/page.tsx`, líneas 62 y 160-168) y el pie
  es `PieDePaso` renderizado en servidor; `MismaPersona`
  (`web/components/misma-persona.tsx`) lleva los decididos en estado de cliente
  (`decididos`) que no alcanza al pie. Las decisiones solo van al Stream
  `eira:decisiones` para que las aplique el procesador, así que ni la
  revalidación cambia el conteo. Habría que subir el estado de "decididos en
  esta sesión" a un componente cliente que envuelva también el pie.
- **Prueba que lo cubre:** `web/e2e/04-calidad.spec.ts` (queda fallando a
  propósito; todo lo demás del caso pasa: estrellas, pares, escritura en
  `eira:decisiones`).

## Baja — El rechazo de `.xlsm` llega por el mensaje genérico

- **Pasos:** en Subir, elegir un archivo `.xlsm`.
- **Esperado (del contrato de la API):** el mensaje específico "Los archivos
  .xlsm (con macros) no se aceptan. Guarda una copia como .xlsx y súbela."
- **Obtenido:** `react-dropzone` lo rechaza en cliente con el mensaje genérico
  "Solo se aceptan .xlsx o .csv." (`web/components/subir.tsx`, `textoError`,
  línea 23), así que el mensaje específico del servidor
  (`web/app/api/subir/route.ts`, línea 33) nunca se ve por la interfaz. La
  usuaria igual recibe un aviso claro; es una diferencia de copy, no de
  comportamiento. Si se quiere el mensaje específico habría que admitir `.xlsm`
  en `accept` y rechazarlo a mano, o afinar `textoError` por extensión.
- **Prueba que lo cubre:** `web/e2e/03-subir.spec.ts` (pasa verificando que hay
  mensaje de rechazo).

## No verificado

- Sin el procesador de Python corriendo, los trabajos quedan en `pendiente`:
  no se probó el avance automático de Subir a Calidad vía `eira:eventos`, ni la
  aparición de fuentes tras procesar.
- El tablero de Metabase incrustado no se probó (no hay `metabase/enlaces.json`
  en este entorno).
- Impresión / guardar PDF: el botón existe y llama a `window.print()`, no se
  verificó la salida impresa.
