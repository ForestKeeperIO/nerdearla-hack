## Hechos del repo (verificados)

- `URL_VALKEY = 'redis://127.0.0.1:6379'` sin contraseña; el script descarga Valkey y lo arranca con `--appendonly yes` en `.valkey/data` (clave AOF en disco).
- El plan guarda en Valkey solo claves HMAC; **nombres solo en memoria** — pero `imp:dup` guarda `ParDuplicado` y `Anomalia.detalle` es texto libre: si meten el nombre ahí, violan su propia regla.
- `IMPACTO_HMAC_KEY` en `.env` (gitignored, bien) pero **en la misma máquina que el AOF**.
- `idEira` = 3 letras + fecha ≈ **<25 bits efectivos**; folio ≈ 35 bits.
- PIN `1111`/`2222`, token Bearer; **SSE no puede mandar `Authorization` desde `EventSource`** → riesgo de quedar abierto o con token en URL.

## Modelo de atacantes y fronteras

| Atacante | Frontera |
|---|---|
| Visitante del túnel HTTPS público | API con PIN débil, subida de archivos |
| Otro proceso/usuario en el VPS o la LAN | Puerto 6379 sin auth |
| Coordinación maliciosa o errada | XLSX/CSV no confiable |
| Portador de tarjeta clonada / folio leído | `/api/asistencia`, `ligarFolio` |
| Quien obtenga el AOF o el disco | Re-identificación por diccionario |

## 8 riesgos por severidad

| # | Riesgo | Escenario | Mitigación en 3 h |
|---|---|---|---|
| 1 | Zip bomb / XLSX malformado | Un `.xlsx` de 1 MB se expande a GB y tumba el demo en vivo | Límite de tamaño multipart (10 MB) y de filas; rechazar `.xlsm` |
| 2 | Valkey sin auth + AOF con datos | `FLUSHALL` durante el demo; lectura de `imp:*`; si el puerto se expone, RCE estilo Redis | `bind 127.0.0.1` explícito + `requirepass` en el script |
| 3 | HMAC ≠ anonimización | Con el AOF, probar ~700M de `idEira` candidatos re-identifica personas | Declarar "seudonimización"; nunca decir "anónimo" ni "cifrado" en README |
| 4 | Excel originales en disco | La PII real (nombre, CURP, servicio de salud) queda en `data/` en texto plano; repo público | Solo datos sintéticos en demo; documentar retención y borrado como "para piloto" |
| 5 | Auth simulada + SSE abierto | Cualquiera con la URL ve el stream y prueba `1111` sin límite | Validar token en query del SSE, TTL corto, rate-limit en login; declarar "simulado" |
| 6 | Folio NFC como credencial única | Tarjeta clonada o folio visto → asistencias "verificadas" falsas; `ligarFolio` liga cualquier folio a cualquier ID | Renombrar a "registro de presencia", no "verificación de identidad"; declarar demo |
| 7 | Supresión <5 insuficiente | Diferencia de dos filtros traslapados aísla a una persona; y nombres en `detalle`/`motivo` rompen la regla "sin nombres" | Nunca guardar nombre en `imp:dup`/`imp:anom` (solo claves y núm. de fila); documentar la limitación |
| 8 | Inyección de fórmulas en CSV + sobre-afirmaciones | `definicion`/`advertencias` con `=` al abrir en Excel; README que diga "cumple LFPDPPP" | Prefijar `'` a celdas que empiecen con `=+-@`; README solo: "seudonimiza, sin garantías, datos ficticios" |

## "Simulado" aceptable vs no aceptable

- **Sí:** usuarios/PIN, NFC como prueba de concepto, HTTPS vía túnel, datos ficticios.
- **No:** llamar "anónimos" a datos re-identificables, "seguro" a Valkey sin auth, "verificada" a una tarjeta clonable, ni sugerir cumplimiento de privacidad mexicana.
