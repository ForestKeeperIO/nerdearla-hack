# Pedidos al procesador (sin cambios en su rama)

Reproducción en staging con `13a806d`, archivos ficticios. Los números de línea son de `py/procesador/` en ese commit.

| Prioridad | Dónde | Qué necesitamos y cómo comprobarlo |
|---|---|---|
| Bloquea los Excel de `reportes/` | `mapeo.py:26`, `iniciativas.py:17-24`, `analizar.py:187-196` | Leer el encabezado exacto `Tipo` y resolver los valores del catálogo, incluidos `Donación de trenza` y `Entrega de peluca`. Subido por `/api/subir` con `unidad=donacion`, el Excel nuestro produjo **80 donaciones y 0 entregas** en SQLite; las celdas dicen 60 y 20. Su archivo homónimo de `datos_demo` sí se lee como 40 filas de donación y 20 entregas. No cambiar el rol ni inventar beneficiarias en el tablero. |
| Presencia del tablero | `trabajos.py:57-73`, `estado.py:17-21`, `importar.py:174-187`, `proyeccion.py:23-25` | Conservar `estado_clave` del trabajo por fuente (o la clave INEGI resuelta por fila), proyectar `eira:presencia:<programa>` y `eira:presencia:global`: **registros**, no suma de objetos. Hoy la app no recibe el mapa. El exportador SQL puede recuperar la entidad de la ficha del trabajo si aún existe; no puede reconstruirla solo con `eira.sqlite`. |
| Recuperación | `trabajos.py:64-75`, `worker.py:51-78` | Si el proceso cae entre commit SQLite y MULTI en Valkey, la reentrega reconoce `trabajo` pero no reemite la proyección. Ofrecer reconstrucción desde SQLite y llave estable; recuperar pendientes de consumidores desaparecidos sin repetir decisiones. Probar caída y reinicio antes de un piloto. |
| Compatibilidad de carga | `trabajos.py:60-65` | El contrato admite `segun_fila`/vacío, pero el validador exige un tipo del catálogo. Dar soporte con un error por fila ambigua. El API actual también valida la unidad; en staging se usó `donacion`, tal como indica su README. |
| Minimización de datos | `trabajos.py:67-96` | Tras éxito o rechazo definitivo, borrar los bytes de `eira:archivo:<id>`; actualmente la carga cruda con nombres queda hasta el TTL del frontend. Mantener los bytes para reintentos que aún los necesiten. |
| Rotular roles correctamente | `proyeccion.py:109-115` | `don:*` agrupa cualquier rol que no sea impactado (incluye voluntaria y un rol ausente). Si entran más iniciativas, separar roles para no publicar voluntarias como donantes. En los dos programas de demostración el único rol no impactado es donante. |

No pedimos duplicar `per:*` ni mover donantes allí. Las claves canónicas del procesador bastan; el lector frontend debe elegirlas explícitamente. No representar los registros sin ID como personas identificadas.
