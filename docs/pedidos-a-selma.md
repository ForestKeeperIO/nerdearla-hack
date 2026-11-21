# Pedidos al procesador (sin cambios en su rama)

## Alta de «Otro programa»

Los cinco programas de la sección 3 de la guía ya existen en el catálogo de `a74bb6c`. **No requieren cambios en Python.** Para Selma, la carga debe enviar el ID y una unidad concreta de `tipos_de_registro`, no `segun_fila`.

Falta el alta de un nombre libre: `Catalogo.programa()` solo resuelve IDs o nombres existentes y `Procesador.procesar_trabajo()` rechaza un programa desconocido. No existe un ID genérico `otro`. La web reconoce un nombre ya dado de alta; para un nombre nuevo avisa antes del envío y la API devuelve 422 sin guardar bytes ni crear un trabajo.

**Pedido:** acordar cómo registrar un nombre con un ID estable y la unidad `atencion`, `participacion`, `entrega_insumo` o `donacion`. Conservar el nombre de presentación y proyectar por ID en Valkey y el Atlas. No agrupar programas distintos bajo «Otro» ni contar a donantes como personas impactadas. Criterio de aceptación: subir dos CSV con nombres de programa distintos; ambos aparecen por separado en los filtros y en el CSV del reporte.

Reproducción en staging con `13a806d`, archivos ficticios. Los números de línea son de `py/procesador/` en ese commit.

Actualización: para la demo la integración ya publica presencia usando la ficha del trabajo y elimina bytes terminales por evento. Son recomendaciones para una futura solución nativa, no bloqueos del corte con los archivos de `datos_demo`. No activar dos escritores de presencia.

| Prioridad | Dónde | Qué necesitamos y cómo comprobarlo |
|---|---|---|
| Bloquea los Excel de `reportes/` | `mapeo.py:26`, `iniciativas.py:17-24`, `analizar.py:187-196` | Leer el encabezado exacto `Tipo` y resolver los valores del catálogo, incluidos `Donación de trenza` y `Entrega de peluca`. Subido por `/api/subir` con `unidad=donacion`, el Excel nuestro produjo **80 donaciones y 0 entregas** en SQLite; las celdas dicen 60 y 20. Su archivo homónimo de `datos_demo` sí se lee como 40 filas de donación y 20 entregas. No cambiar el rol ni inventar beneficiarias en el tablero. |
| Presencia del tablero | `trabajos.py:57-73`, `estado.py:17-21`, `importar.py:174-187`, `proyeccion.py:23-25` | Conservar `estado_clave` del trabajo por fuente (o la clave INEGI resuelta por fila), proyectar `eira:presencia:<programa>` y `eira:presencia:global`: **registros**, no suma de objetos. Hoy la app no recibe el mapa. El exportador SQL puede recuperar la entidad de la ficha del trabajo si aún existe; no puede reconstruirla solo con `eira.sqlite`. |
| Recuperación | `trabajos.py:64-75`, `worker.py:51-78` | Si el proceso cae entre commit SQLite y MULTI en Valkey, la reentrega reconoce `trabajo` pero no reemite la proyección. Ofrecer reconstrucción desde SQLite y llave estable; recuperar pendientes de consumidores desaparecidos sin repetir decisiones. Probar caída y reinicio antes de un piloto. |
| Compatibilidad de carga | `trabajos.py:60-65` | El contrato admite `segun_fila`/vacío, pero el validador exige un tipo del catálogo. Dar soporte con un error por fila ambigua. El API actual también valida la unidad; en staging se usó `donacion`, tal como indica su README. |
| Minimización de datos | `trabajos.py:67-96` | Tras éxito o rechazo definitivo, borrar los bytes de `eira:archivo:<id>`; actualmente la carga cruda con nombres queda hasta el TTL del frontend. Mantener los bytes para reintentos que aún los necesiten. |
| Rotular roles correctamente | `proyeccion.py:109-115` | `don:*` agrupa cualquier rol que no sea impactado (incluye voluntaria y un rol ausente). Si entran más iniciativas, separar roles para no publicar voluntarias como donantes. En los dos programas de demostración el único rol no impactado es donante. |

No pedimos duplicar `per:*` ni mover donantes allí. Las claves canónicas del procesador bastan; el lector frontend debe elegirlas explícitamente. No representar los registros sin ID como personas identificadas.

## Separar la identidad del evento

En `eira:decisiones`, para `tipo=persona`, el frontend mantiene `decision=misma|distinta` y añade `intencion=mismo_evento|diferentes_eventos|distinta`. Los dos primeros valores viajan con `decision=misma`. Los consumidores antiguos ignoran `intencion`.

Solicitamos que **mismo_evento** unifique las personas y, solo si las dos filas aún contaban, omita la segunda y reproyecte la unidad correspondiente. **diferentes_eventos** unifica únicamente la identidad: ambos eventos mantienen su estado de conteo. **distinta** mantiene dos identidades. Reaplicar el mensaje no debe volver a restar. Guardar la intención en la bitácora y devolver el estado aplicado antes de confirmar en la interfaz.

Publicar por cada lado de `eira:pares` `fecha` (fecha del evento ISO, no el corte ni el nacimiento), `servicio` y `programa`, además de archivo y fila. No publicar nombres. Hoy el frontend recupera el programa de la fuente y no infiere los campos ausentes.

Publicar también un `persona_id` opaco por lado, nunca iniciales más nacimiento en claro. Hoy ninguno de los dos proyecta el folio de persona en el par. A/B muestran el localizador único `fuente:fila` y, cuando existe en `eira:huellas:fila`, la huella completa del registro. No se etiqueta una huella de fila como identificador de persona. Edad, iniciales y municipio proceden de `etiqueta`; no se reconstruye el nacimiento.

Verificado en código: `py/motor/worker.py::_decidir_par` fusiona identidades con `misma` sin descontar actividades; `origin/soe_python` (`13a806d`), `py/procesador/trabajos.py::aplicar_decision`, rechaza decisiones distintas de `misma` y `distinta` y reproyecta personas. La interfaz advierte esta limitación antes de enviar el caso de mismo evento.
