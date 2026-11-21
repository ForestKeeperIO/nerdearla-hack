# Recorrido guiado (`/demo`)

`/demo` recorre sola la plataforma en 13 globos (unos 6,5 s cada uno) agrupados en los 4 pasos del demo. Tiene Anterior, Pausa/Seguir, Siguiente y Salir; también flechas del teclado y Esc.

Corrida sin intervención del 21 nov contra una copia aislada con el estado previo (108 personas, 6 municipios), con navegador sin cabeza:

```
 8.7s [1/13]  Paso 1 · Todo EIRA en una pantalla        /tablero                                   personas=108 municipios=6
16.9s [2/13]  Paso 1 · Filtramos por programa           /tablero?programa=tamizaje-rosa            personas=92
24.3s [3/13]  Paso 1 · Y por territorio                 /tablero?programa=tamizaje-rosa&estado=14  personas=92
31.5s [4/13]  Paso 1 · Y por periodo                    …&desde=2026-01&hasta=2026-06              personas=70
38.9s [5/13]  Paso 2 · Llega una hoja nueva             /subir   «Hoja recibida. El motor la está leyendo.»
46.4s [6/13]  Paso 2 · El sistema dice qué pasó         /subir   «Se agregaron 33 filas; 2 ya estaban en otros reportes y se omiten.»
53.7s [7/13]  Paso 3 · La cifra sube sola               /tablero                                   personas=138 municipios=7
61.4s [8/13]  Paso 3 · Chapala aparece en el mapa       /tablero
68.7s [9/13]  Paso 3 · La carga queda registrada        /tablero
75.6s [10/13] Paso 4 · Dos reportes, una selección      /reportes?origen=tablero
83.1s [11/13] Paso 4 · Impacto para aliados estratégicos   /reportes/aliados?origen=tablero
90.5s [12/13] Paso 4 · Territorial para gobierno y hospitales /reportes/territorial?origen=tablero
98.1s [13/13] Fin del recorrido
errores de consola: ninguno
```

La subida es real: manda `web/public/demo/jornada-nueva-chapala.xlsx` a `/api/subir`, igual que «Subir archivos». Si la hoja ya estaba cargada, el motor la marca como repetida y no suma doble; el globo lo dice.
