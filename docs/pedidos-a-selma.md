# Separar la identidad del evento

En `eira:decisiones`, para `tipo=persona`, el frontend mantiene `decision=misma|distinta` y añade `intencion=mismo_evento|diferentes_eventos|distinta`. Los dos primeros valores viajan con `decision=misma`. Los consumidores antiguos ignoran `intencion`.

Solicitamos que **mismo_evento** unifique las personas y, solo si las dos filas aún contaban, omita la segunda y reproyecte la unidad correspondiente. **diferentes_eventos** unifica únicamente la identidad: ambos eventos mantienen su estado de conteo. **distinta** mantiene dos identidades. Reaplicar el mensaje no debe volver a restar. Guardar la intención en la bitácora y devolver el estado aplicado antes de confirmar en la interfaz.

Publicar por cada lado de `eira:pares` `fecha` (fecha del evento ISO, no el corte ni el nacimiento), `servicio` y `programa`, además de archivo y fila. No publicar nombres. Hoy el frontend recupera el programa de la fuente y no infiere los campos ausentes.

Verificado en código: `py/motor/worker.py::_decidir_par` fusiona identidades con `misma` sin descontar actividades; `origin/soe_python` (`13a806d`), `py/procesador/trabajos.py::aplicar_decision`, rechaza decisiones distintas de `misma` y `distinta` y reproyecta personas. La interfaz advierte esta limitación antes de enviar el caso de mismo evento.
