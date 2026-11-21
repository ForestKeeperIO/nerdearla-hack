# Conversación con EIRA: "Data management for social impact"

- **Cuándo:** 2026-11-21, 11:41 hora de CDMX, durante la vibeathon, con el equipo de EIRA en sala.
- **Qué es este archivo:** el resumen que generó Granola de esa conversación. **No es una transcripción:** el plan de Granola de la cuenta no la incluye, así que no hay citas textuales. Las notas privadas estaban vacías.
- **Por qué importa:** es la única validación directa con EIRA. Donde contradiga a otro documento del repositorio, manda este.

## Resumen de Granola, tal cual

### Contexto del registro de datos

- Registros actuales en Excel, una fila por evento por persona.
- Columnas típicas: nombre, estudio, edad, ciudad, asistencia, tipo de servicio (por ejemplo, nutrióloga).
- Cada programa maneja su propio archivo; Presidencia los consolida manualmente.
- Principal dolor: concentrar todos los Excel de 3 o más coordinaciones es lento y propenso a errores.

### Sistema de identificación de usuarios

- ID actual: iniciales de apellido paterno, materno y nombre + fecha de nacimiento (`AAAAMMDD`).
- Riesgo identificado: colisiones entre personas con mismo nombre y fecha de nacimiento.
  - Ejemplo real del sector bancario: ocurre frecuentemente entre personas de distintos estados.
- Posibles mejoras discutidas:
  - Agregar iniciales del estado de origen.
  - Usar directamente la CURP (ya presente en la identificación oficial).

### Necesidades de reporte

- Métricas más solicitadas por donantes y aliados:
  - Número de personas impactadas.
  - Edad promedio.
  - Datos desglosados por ciudad.
- Las preguntas varían por aliado; se necesita una plantilla base con opción de preguntas adicionales.
- Visión deseada: subir Excel, aplicar filtros de calidad, obtener vista previa y exportar.
  - Analogía usada: como una calificación tipo Forbes (3 o 4 estrellas).

### Próximos pasos

- Compartir archivos de ejemplo de Excel internos. Se mencionó subir la información durante la reunión para mostrar la estructura actual de los registros.
- Identificar los 2 reportes más importantes y sus audiencias. Ejemplo concreto: Tamizaje Rosa para socios estratégicos. Definir formato y campos clave para cada audiencia.

## Lo que se decidió a partir de la nota

| Lo que dijo EIRA | Decisión |
|---|---|
| Una fila por evento por persona, con esas columnas | El procesamiento espera esas columnas; los encabezados exactos siguen siendo supuestos hasta recibir sus Excel |
| Tres o más coordinaciones, consolidación manual | La plataforma acepta varios archivos y los unifica |
| ID = iniciales + fecha de nacimiento, con riesgo de choque | Se respeta su ID. Mismo ID con nombres distintos se le pregunta a una persona |
| Personas impactadas, edad promedio, desglose por ciudad | Son los tres indicadores base del informe |
| Plantilla base con preguntas adicionales | Informe base; plantillas por audiencia quedan como deseable |
| Subir, filtros de calidad, vista previa, exportar, con estrellas | Son los cuatro pasos de la interfaz, y cada archivo recibe de 1 a 5 estrellas |

## Sigue sin validar con EIRA

- Los encabezados exactos de sus Excel y el orden de su ID (iniciales antes o después de la fecha).
- Si sus archivos traen título arriba, fila de totales u hojas de resumen.
- Si cuando dos coordinaciones registran la misma jornada es un servicio contado dos veces o son dos servicios.
- Cuáles son sus dos informes más importantes, aparte del ejemplo de Tamizaje Rosa.
- Si llevan un celular Android a las jornadas (de eso depende el registro con tarjeta NFC).
