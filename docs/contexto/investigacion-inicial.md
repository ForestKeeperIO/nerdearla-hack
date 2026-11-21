# Investigación inicial: evento, jurado y patrones de proyectos ganadores

Hecha el 2026-11-21 con búsqueda web. Marca qué está confirmado y qué es inferencia. Las listas de fuentes de las rondas posteriores están en `docs/fuentes/`.

## El evento

- **Nerdearla Vibeathon by Devin**, CDMX, oficinas de Amazon (Puerta Polanco). https://vibeathon-mexico-2026.devpost.com/
- Código de 10:30 a 13:30 y de 14:30 a 15:30. Cierre en Devpost a las **16:00**. Pitch de 2 minutos.
- Obligatorio: repositorio público con licencia abierta, README que explique cómo levantarlo, datos ficticios, y distinguir lo implementado de lo simulado, con riesgos, costos, próximos pasos y preguntas abiertas para EIRA.
- Premios: tres viajes (Madrid, Buenos Aires, Santiago). Según Devpost no hay premios por patrocinador ni puntos extra por usar Valkey, AWS o Devin. Un listado de terceros dice lo contrario, pero con sede y anfitrión equivocados.
- Criterios: Usabilidad, Impacto, Escalabilidad, Privacidad y confianza, Innovación, Funcionamiento real del prototipo. Los pesos no están publicados.

## Límites que pone la guía de EIRA para el Reto 3

- Nunca presentar una deduplicación estimada como cifra oficial sin validación.
- Si faltan identificadores, mostrar los límites de la medición.
- Los tableros no deben exponer información personal innecesaria.
- Solo datos de prueba ficticios.
- Caso práctico: dos archivos, uno con 120 atenciones y otro con 80 participaciones; algunas filas son de la misma persona. Hay que explicar qué se puede sumar y qué no.

## Jurado

| Juez | Confirmado | Qué mira (inferido) | Qué mostrarle |
|---|---|---|---|
| Martí Cristobal (BettaTech) | Ingeniero y creador de contenido. Su charla del día anterior: "La IA escribe el código… ¿y tú qué haces?" | Ingeniería detrás del código generado | Una decisión de diseño explicada; qué es real y qué simulado |
| Roberto Luna Rojas | Sr Developer Advocate de Valkey en AWS | Valkey haciendo trabajo real | Una función visible que dependa de Valkey; nunca decir "Redis" |
| Valeria Rivera Contreras | Inside Systems Engineer en Nutanix; organiza la comunidad CNCF de CDMX | Infraestructura, seguridad, portabilidad | Sin datos personales en la base, despliegue reproducible, formatos abiertos |
| Gael Hernández | "FDE @orbitware / @cognition" según Devpost | Uso de Devin | Evidencia breve de cómo se usó Devin |
| Ximena Cruz | Nerdearla | Usabilidad y narrativa | El flujo contado desde quien lo usa |
| Jazmin Ivette Reyes Serrano | Sin cargo publicado; no se pudo identificar | Desconocido | Apego estricto a la guía de EIRA |

## Patrones de proyectos ganadores

De las ediciones 2025 y 2026 de esta misma vibeathon y de relatos de jueces y ganadores de otros hackathones:

1. Un solo flujo crítico de punta a punta; mejor el caso práctico de la guía.
2. Lo más difícil funciona de verdad en el demo.
3. Una función memorable con nombre propio (en 2025 destacó un "Health Score" entre muchos tableros iguales).
4. Honestidad como ventaja: tabla "implementado / simulado / para piloto".
5. Privacidad visible en pantalla.
6. Números medidos, no promesas.
7. Especificación antes de código.
8. Hablar con el equipo de la organización en la primera hora y citar su respuesta.
9. Desplegado, con datos sembrados y video de respaldo.
10. Texto de Devpost con una línea por criterio.

En hackathones de Redis y Valkey, los ganadores ligaron cada estructura de datos a algo visible en el demo; se premia que la base haga trabajo real y no que sea un caché.

## Cifras públicas de EIRA

Cambian de unidad entre fuentes, así que no se citan como hecho salvo la primera:

- Más de 51,000 personas beneficiadas a septiembre de 2026 (guía oficial, que aclara que no son pacientes únicas).
- Más de 40,000 mujeres y 86,000 estudios (sitio de EIRA, 2025).
- Más de 300 resultados de Papanicolaou al mes (guía oficial).

Programas: Tamizaje Rosa, Melenas en Movimiento, Salud que Florece, Cambiando las Reglas, Comunidades de Origen. Sede: Ciudad Guzmán (Zapotlán el Grande), Jalisco.

## Sin verificar

- Identidad y cargo de Jazmin Reyes Serrano; perfil de Gael Hernández.
- Pesos de los criterios y formato exacto del pitch.
- Si el uso de Devin o de Valkey pesa en el puntaje.
