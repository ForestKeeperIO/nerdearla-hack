# Trabajador de procesamiento (Python)

La fuente de verdad entre Python y el frontend es `docs/contrato-valkey.md`.
Conexión: `pip install valkey` y `VALKEY_URL` / `VALKEY_PASSWORD` en el entorno.
Lee trabajos del stream `eira:trabajos` con el grupo `procesadores` (XREADGROUP).
El archivo subido está en `eira:archivo:<trabajoId>` (bytes, caduca en 1 h).
Ve escribiendo el estado en el hash `eira:trabajo:<trabajoId>` (procesando → listo/duplicado/error).
Escribe los resultados en `eira:fuente:*`, `eira:per:*`, `eira:cnt:*`, `eira:anom:*`, etc.
Avisa cada cambio con `PUBLISH eira:eventos {"tipo": "trabajo", "id": "…"}` y haz XACK.
Las decisiones humanas llegan por el stream `eira:decisiones`.
Nunca escribas nombres completos ni el ID de EIRA en claro: solo identificadores opacos.
Prueba contra la semilla: `npm run valkey` y `npm run semilla` (puerto 6391), luego `python3 ejemplo_worker.py`.
