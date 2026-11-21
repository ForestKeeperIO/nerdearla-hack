# Guía de EIRA para participantes (texto extraído)

Fuente: "Tecnología que transforma vidas. Guía institucional y técnica para participantes", Eira, Movimiento Rosa A.C., Nerdearla 2026, 21 de noviembre de 2026.
Original: https://drive.google.com/file/d/1W-t7xGprXyj7PjzC7iCw32aiDgoZGXXl/view

Texto extraído del PDF para que los agentes lo puedan leer. El documento es de EIRA; ante cualquier diferencia manda el original. Se quitaron los pies de página repetidos. Nuestro reto es el **Reto 3**; los demás se conservan como contexto.

---

```text
TECNOLOGÍA QUE TRANSFORMA VIDAS
               GUÍA INSTITUCIONAL Y TÉCNICA PARA PARTICIPANTES
       Eira, Movimiento Rosa A.C. | Nerdearla 2026 | 21 de noviembre de 2026

1. Bienvenida: el propósito de este desafío
La tecnología puede ayudar a una organización social a atender mejor a las personas,
pero solo cuando responde a las condiciones reales de su operación. Esta guía ofrece a
los equipos una explicación de los procesos, limitaciones y necesidades de Eira,
Movimiento Rosa A.C. para que puedan diseñar soluciones viables, accesibles y seguras.
No buscamos digitalizar por digitalizar: buscamos disminuir tareas repetitivas, evitar
interrupciones y fortalecer la continuidad de la atención.
Cada equipo puede elegir uno de los cuatro retos. Los desafíos son independientes para
permitir prototipos realizables en una jornada, aunque a futuro podrían interoperar.
Durante el evento habrá representantes de EIRA disponibles para aclarar dudas
operativas. Toda función clínica, intercambio de información personal o despliegue con
pacientes reales requerirá revisión posterior.

2. Historia, misión de trabajo e impacto
Eira, Movimiento Rosa A.C. fue fundada en 2017 después de que la madre de su
fundadora fuera diagnosticada con cáncer de mama. La experiencia familiar impulsó una
iniciativa que evolucionó hacia una organización dedicada a acercar prevención, detección
oportuna, educación en salud y acompañamiento a mujeres y comunidades.
Con sede en Ciudad Guzmán, Jalisco, EIRA desarrolla trabajo comunitario y alianzas
institucionales para llevar servicios e información a distintos territorios. A septiembre de
2026, la organización reporta más de 51,000 personas beneficiadas. Esta cifra acumulada
es el dato institucional confirmado para esta guía; no debe interpretarse como número de
pacientes únicos de un programa ni como número de estudios realizados.
El desafío tecnológico tiene una dimensión humana: detrás de cada formulario existe una
paciente que necesita continuidad de atención; detrás de cada documento retrasado, una
jornada que podría complicarse; detrás de cada informe, una oportunidad de demostrar el
alcance de los recursos invertidos.

3. Programas y ámbitos de acción
                                              Prevención y detección oportuna mediante
                                              campañas de salud donde se ofrecen
                                              servicios como Papanicolaou, ultrasonido
Tamizaje Rosa
                                              de mama, exploración clínica y valoración
                                              nutricional, según las condiciones de cada
                                              jornada.

                                              Recolección de cabello y elaboración de
Melenas en Movimiento
                                              pelucas oncológicas

                                              Educación para la salud, participación
Salud que Florece                             juvenil y acciones en escuelas y
                                              comunidades.

                                              Educación en salud menstrual y acceso a
Cambiando las Reglas
                                              insumos.

                                              Acciones comunitarias de salud preventiva,
Comunidades de Origen
                                              educación y acceso a insumos.

Las descripciones anteriores son resúmenes orientativos.

4. Panorama operativo de una jornada médica
Para organizar una jornada, EIRA propone fechas y servicios; coordina con gobiernos
municipales y aliados; solicita cartas compromiso en su formato institucional, fotografías
del espacio, logotipos, responsables de coordinación y apoyo en la convocatoria y registro
de pacientes. Durante la jornada, su personal llena formatos físicos, registra datos
generales y ginecoobstétricos, y captura la información el mismo día en Google Forms y/o
Excel. Los documentos físicos se archivan. En las comunidades se presentan
frecuentemente dificultades de conexión a internet.
El ciclo no termina con la atención: hay que organizar registros, conservar historial,
gestionar resultados de estudios, contactar a pacientes que requieren seguimiento y
elaborar informes de impacto. Los cuatro retos corresponden a diferentes puntos de ese
ciclo.

RETO 1. Expediente digital único y registro de pacientes

Objetivo del desafío
Diseñar un mecanismo de registro y consulta que permita reconocer a una paciente
recurrente, conservar el historial de servicios y actualizar solo la información necesaria,
aun con conectividad intermitente.

Cómo funciona hoy
El personal de Eira llena formatos físicos con datos generales y ginecoobstétricos;
después captura la información el mismo día en Google Forms y/o Excel. Los documentos
originales se archivan físicamente. Las pacientes se identifican principalmente por nombre
completo. Si una mujer acude cuatro veces en un año, puede tener que registrarse cuatro
veces. El equipo utiliza computadoras portátiles y consultar antecedentes clínicos durante
una nueva atención es indispensable.

Problemas concretos que debe comprender el equipo
• Captura repetida de datos de la misma paciente en distintas visitas y servicios.
• Riesgo de errores de transcripción, registros duplicados y dificultad para localizar
expedientes.
• Conexión a internet frecuentemente inestable durante jornadas.
• La búsqueda por nombre puede producir coincidencias ambiguas entre personas
diferentes.
• La información clínica debe estar disponible para personal autorizado, sin exposición
innecesaria.

Capacidades deseables de la solución
• Crear un identificador interno estable por paciente y registrar visitas y servicios por
separado.
• Buscar posibles coincidencias usando varios atributos y pedir confirmación humana
antes de vincular expedientes.
• Actualizar antecedentes y datos de contacto sin borrar la historia de cambios.
• Registrar servicios prestados, fechas, sedes y observaciones autorizadas; consultar
cronología clínica.
• Permitir captura local sin internet y sincronización segura con detección de conflictos.
• Gestionar roles de captura, consulta clínica y administración; mantener bitácora de
cambios.
• Exportar datos operativos y estadísticas sin revelar información sensible innecesaria.

Caso práctico para diseñar y probar
Paciente ficticia “María Ejemplo” acude en febrero a un Papanicolaou y vuelve en mayo a
un ultrasonido. El sistema debe encontrar su expediente, confirmar que es la misma
persona, actualizar un dato de contacto y añadir una nueva visita. Si se pierde internet, la
captura se conserva y se sincroniza cuando regresa la conexión. Si existe otra paciente
con nombre similar, el sistema no debe fusionarlas automáticamente.

Qué puede demostrar un prototipo en un día
Pantalla de alta de paciente ficticia; búsqueda y detección de coincidencia; segunda visita
con historial; simulación verificable de trabajo sin conexión; explicación del control de
acceso y sincronización.

Preguntas que conviene resolver con los mentores de Eira
• ¿Qué campos exactos del formato de Eira son indispensables para identificar y atender
a una paciente?
• ¿Qué personal puede consultar antecedentes clínicos y quién puede corregirlos?
• ¿Qué debe suceder si dos capturas offline modifican el mismo expediente?

Límites y condiciones de implementación
No usar el nombre como identificador único ni fusionar registros sin confirmación. No
utilizar datos reales durante el hackathon. El sistema debe contemplar protección de
información de salud, respaldo, recuperación y un mecanismo de contingencia cuando la
tecnología falle.

RETO 2. Coordinación institucional, cartas compromiso y documentación

Objetivo del desafío
Crear un espacio de colaboración entre Eira y las personas coordinadoras de gobiernos
municipales que permita preparar jornadas, reunir requisitos, generar cartas compromiso y
controlar confirmaciones y correcciones.

Cómo funciona hoy
Eira organiza sus jornadas mediante Excel o Google Sheets. Propone fechas y servicios,
solicita a los municipios documentación y confirma responsables y condiciones del
espacio. Utiliza un formato institucional de carta compromiso. Una persona coordinadora
de Eira verifica que los documentos estén completos. El principal problema reportado son
los retrasos en confirmaciones y entrega documental.

Problemas concretos que debe comprender el equipo
• Solicitudes y respuestas documentales que requieren seguimiento manual.
• Retrasos en cartas compromiso, fotografías, logotipos y designación de responsables.
• Dificultad para identificar con rapidez quién debe entregar qué y en qué fecha.
• Necesidad de controlar versiones de documentos y correcciones sin perder trazabilidad.
• Dependencia de coordinación entre instituciones con distintos niveles de familiaridad
digital.

Capacidades deseables de la solución
• Crear expediente por jornada con municipio, sede, fecha propuesta, servicios y
responsables.
• Ofrecer lista de requisitos configurable: carta compromiso, fotografías, logotipos,
persona enlace y apoyo a convocatoria.
• Generar cartas desde la plantilla aprobada por Eira, con campos variables y sin
modificar cláusulas fijas.
• Permitir que el municipio cargue documentos y consulte su estado: pendiente, recibido,
observado o aprobado.
• Facilitar que la persona coordinadora de Eira solicite correcciones y valide cada
documento.
• Registrar fechas, responsables, comentarios, versiones y recordatorios no invasivos.
• Mostrar una vista general de jornadas y pendientes críticos para planear la operación.

Caso práctico para diseñar y probar
Eira crea una jornada ficticia en el municipio “Villa Ejemplo”. El enlace municipal recibe
una lista de requisitos, completa datos para la carta compromiso y sube fotografías del
espacio. Eira observa que falta una imagen y solicita corrección. El municipio la adjunta y
la persona coordinadora valida la carpeta. El tablero refleja qué requisitos están completos
y cuáles impiden avanzar.

Qué puede demostrar un prototipo en un día
Crear una jornada, generar una carta desde plantilla de ejemplo, subir un archivo ficticio,
solicitar una corrección, aprobar un requisito y visualizar pendientes por municipio.

Preguntas que conviene resolver con los mentores de Eira
• ¿Qué campos de la carta compromiso se pueden rellenar automáticamente y cuáles
deben permanecer inalterables?
• ¿Qué documentos son obligatorios para confirmar una jornada y cuáles pueden
entregarse después?
• ¿Qué recordatorios resultan útiles y quién debe recibirlos?

Límites y condiciones de implementación
La generación automática no equivale a firma o aprobación jurídica. Eira conserva la
validación institucional final. La plataforma no debe permitir alterar cláusulas protegidas
sin autorización y debe registrar las versiones de documentos.
RETO 3. Consolidación y visualización del impacto social

Objetivo del desafío
Construir una herramienta que reúna datos de diferentes programas y fuentes, facilite su
validación y permita a dirección y coordinaciones producir indicadores e informes
confiables.

Cómo funciona hoy
Cada programa de Eira utiliza diferentes plataformas. Al preparar informes para aliados y
donantes, el equipo consolida manualmente distintos archivos. Los principales obstáculos
son integración de fuentes, duplicidades, cálculo de indicadores y elaboración de gráficas.
La consulta intensiva de indicadores ocurre principalmente durante la preparación de
informes.

Problemas concretos que debe comprender el equipo
• Diferentes estructuras de columnas, fechas y categorías entre programas.
• Confusión potencial      entre   beneficiarias   únicas, visitas, estudios, insumos y
participaciones.
• Riesgo de doble conteo cuando una persona aparece varias veces o en varios
programas.
• Tiempo de trabajo manual para preparar cifras y visualizaciones.
• Necesidad de explicar de dónde proviene cada indicador y cómo se calculó.

Capacidades deseables de la solución
• Importar archivos de ejemplo CSV/Excel con columnas heterogéneas y mapearlas a un
modelo común.
• Definir un diccionario de datos con unidades, periodos, programa y fuente.
• Aplicar reglas explícitas de calidad: faltantes, duplicados probables, formatos inválidos y
discrepancias.
• Separar personas únicas, servicios, atenciones, estudios, entregas de insumos y
participaciones.
• Construir filtros por programa, periodo, municipio y tipo de servicio cuando existan datos.
• Mostrar indicadores y gráficos pertinentes con fecha de corte, denominador y fuente.
• Exportar un resumen o reporte y conservar trazabilidad de ajustes manuales.

Caso práctico para diseñar y probar
Dos archivos ficticios describen actividades de distintos programas. Uno contiene 120
atenciones y otro 80 participaciones; algunas filas corresponden a una misma persona
ficticia. El equipo debe explicar qué puede sumar, qué no puede sumar y cómo calcularía
un total de beneficiarias únicas solo cuando exista identificación suficiente y una regla
validada. El tablero debe mostrar cifras y advertencias sobre calidad de datos.

Qué puede demostrar un prototipo en un día
Importación de dos fuentes sintéticas, mapeo de campos, detección de anomalías,
visualización de indicadores diferenciados y exportación de un informe de muestra.

Preguntas que conviene resolver con los mentores de Eira
• ¿Cuáles son las definiciones institucionales exactas de beneficiaria, atención, estudio y
participación?
• ¿Cómo se distingue una persona única entre programas cuando no existe identificador
común?
• ¿Qué reportes y desgloses necesitan más frecuentemente dirección y coordinaciones?

Límites y condiciones de implementación
Nunca presentar una deduplicación estimada como cifra oficial sin validación. Si faltan
identificadores, mostrar límites de la medición. Los tableros no deben exponer información
personal innecesaria; los datos de prueba serán ficticios.

RETO 4. Entrega digital segura de resultados de Papanicolaou

Objetivo del desafío
Diseñar una alternativa a WhatsApp para gestionar, revisar, notificar y entregar resultados
de Papanicolaou a cada paciente, con seguridad, continuidad y seguimiento
documentado.

Cómo funciona hoy
El laboratorio entrega a Eira resultados impresos; el equipo los escanea y los asocia a las
pacientes por nombre y otros datos de identificación. Personal administrativo y médico
participa en la revisión previa. Los resultados se envían por WhatsApp, pero cuando la
cuenta se bloquea Eira espera a recuperar el acceso, interrumpiendo las entregas. Se
envían más de 300 resultados mensuales. Eira recopila teléfono y correo electrónico. Ante
hallazgos anormales, personal de Eira contacta directamente a las pacientes. La solución
debe contemplar acceso del equipo de Eira, médicos, laboratorio y pacientes, según sus
funciones.

Problemas concretos que debe comprender el equipo
• Dependencia de un canal externo sujeto a bloqueos.
• Trabajo manual para escanear, identificar y enviar cada documento.
• Necesidad de evitar entregar un resultado a la persona equivocada.
• Dificultad para distinguir documentos cargados, revisados, notificados, consultados y
pendientes de seguimiento.
• La entrega digital no sustituye la comunicación clínica ante hallazgos que requieran
atención.

Capacidades deseables de la solución
• Cargar un PDF escaneado y asociarlo a un expediente mediante comprobación de
identidad y coincidencias.
• Aplicar un flujo de revisión administrativa y autorización clínica antes de ponerlo a
disposición.
• Permitir acceso seguro y diferenciado a personal de Eira, laboratorio, médicos y
paciente.
• Notificar por correo o SMS que un documento está disponible, sin incluir diagnósticos ni
hallazgos.
• Permitir consulta y descarga autenticada, evitando enlaces públicos permanentes.
• Mostrar estados del proceso y registrar fecha de notificación, acceso y acciones de
seguimiento.
• Permitir revocar accesos y corregir asociaciones equivocadas de documentos.
• Contemplar alternativas asistidas para pacientes sin correo utilizable, teléfono propio o
conectividad estable.

Caso práctico para diseñar y probar
El laboratorio entrega un resultado ficticio en papel y Eira lo escanea. Una persona
autorizada lo vincula a “Ana Ejemplo”, un profesional médico revisa y autoriza, y el
sistema envía una notificación simulada sin datos clínicos. Ana verifica su identidad y
consulta el PDF. Un segundo resultado ficticio requiere contacto clínico: el sistema genera
una tarea interna sin revelar el hallazgo en la notificación.

Qué puede demostrar un prototipo en un día
Carga de PDF sintético, asociación con paciente ficticia, revisión y autorización, aviso
simulado, acceso autenticado y panel de estados; explicar qué ocurriría ante error de
identidad o fallo de envío.

Preguntas que conviene resolver con los mentores de Eira
• ¿Qué criterios de identificación se deben exigir antes de liberar un resultado?
• ¿Cómo se gestionan los casos de pacientes que no pueden acceder a correo o SMS?
• ¿Qué roles del laboratorio y del equipo médico pueden cargar, revisar, autorizar y
consultar?
Límites y condiciones de implementación
No usar resultados clínicos reales ni enviar diagnósticos por notificaciones. No publicar
PDFs mediante enlaces abiertos. La revisión y el seguimiento médico deben permanecer
bajo responsabilidad humana. El uso real requerirá análisis jurídico y de seguridad de
datos personales sensibles.

5. Requisitos transversales y sostenibilidad
• Accesibilidad: interfaces claras, instrucciones sencillas, uso desde computadoras
disponibles y alternativas para personas con habilidades digitales limitadas.
• Conectividad: identificar qué funciones deben operar sin internet, cómo se sincronizarán
y qué sucederá si hay conflictos o fallas.
• Privacidad: minimizar datos recolectados, aplicar permisos por rol, cifrado, autenticación,
registros de acceso y políticas de conservación y eliminación.
• Operación: explicar quién administraría la solución, qué capacitación necesita, cómo se
respaldan datos y cómo se atienden incidencias.
• Sostenibilidad: documentar dependencias, servicios externos, licencias, costos
recurrentes y opciones de mantenimiento.
• Interoperabilidad: cuando sea viable, exportar datos en formatos abiertos y evitar que la
información quede atrapada en una sola herramienta.

6. Qué se espera de los equipos durante el hackathon
Cada equipo elegirá uno de los cuatro retos y contará con un solo día para desarrollar una
propuesta técnica y un prototipo. Es preferible demostrar un flujo crítico completo, aunque
acotado, a presentar muchas pantallas sin funcionamiento. La propuesta debe distinguir
claramente lo implementado de lo simulado y explicar qué haría falta para un piloto real.
• Un prototipo con datos ficticios que muestre de inicio a fin el caso de uso elegido.
• Una explicación breve de arquitectura, tecnologías, dependencias y decisiones de
diseño.
• Identificación de riesgos, necesidades de seguridad, operación, costos y próximos pasos
para implementar.
• Preguntas abiertas y supuestos que deban validar con Eira antes de desarrollar una
versión de producción.
Nerdearla definirá las reglas de participación y los mecanismos de evaluación del
hackathon. Esta guía no establece criterios ni puntuaciones de evaluación.

7. Materiales de apoyo y acompañamiento
Eira ha indicado que puede facilitar formatos y documentos institucionales sin datos
personales, sujetos a revisión y autorización previa. Los recursos de mayor utilidad serían:
formato vacío de registro de pacientes, carta compromiso institucional en blanco, ejemplo
ficticio de resultado de Papanicolaou, estructura de un informe y tablas sintéticas para
pruebas. No se asume que todos estos anexos estén disponibles hasta que Eira los
confirme y comparta.
Representantes de Eira estarán disponibles durante el hackathon para resolver preguntas
sobre operación, prioridades y limitaciones. Los participantes deben consultar cualquier
supuesto que afecte la atención médica, la identidad de pacientes, la autorización de
documentos o la definición de indicadores.

8. De un prototipo a una herramienta aplicable
Eira busca implementar las mejores propuestas que resulten viables, pero el hackathon no
equivale a una autorización de despliegue. Una posible continuación incluiría delimitar un
piloto, revisar privacidad y seguridad, validar procesos con personal operativo y clínico,
probar con información sintética y posteriormente determinar condiciones para un uso
controlado. También deberán acordarse mantenimiento, soporte, propiedad intelectual y
responsabilidades con las partes correspondientes.

9. Datos institucionales y notas de alcance
Organización: Eira, Movimiento Rosa A.C. | Fundación: 2017 | Sitio institucional:
www.eiraac.org | Impacto acumulado informado: más de 51,000 personas beneficiadas a
septiembre de 2026 | Evento: Nerdearla, 21 de noviembre de 2026.

                                             ​
                                             ​
```
