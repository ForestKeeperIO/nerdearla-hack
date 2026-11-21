// Mensajes de /api/subir y de procesador/{trabajos,leer}. No mostramos excepciones técnicas.
export function explicarErrorCarga(mensaje = ''): string {
  const reglas: [RegExp, string][] = [
    [/no admite ese tipo de registro|tipo de registro no es válido/i,
      'El tipo de registro no corresponde al programa. Revisa el programa y elige uno de sus tipos de registro.'],
    [/no está en el catálogo|elige un programa habilitado/i,
      'El programa no está habilitado para cargas. Elige un programa del catálogo o pide su alta a coordinación.'],
    [/nombre del programa.*unidad/i, 'Faltan los datos del programa. Escribe su nombre (hasta 100 caracteres) y elige una unidad.'],
    [/caducó/i, 'Se venció el plazo para leer esta copia. Vuelve a elegir el archivo original.'],
    [/no reconocí los encabezados/i, 'No se reconocen las columnas. En la primera hoja con datos, usa al menos dos encabezados como Nombre, ID, Fecha, Municipio o Servicio.'],
    [/ninguna fila de datos/i, 'Solo se encontraron encabezados. Agrega al menos una fila con datos debajo de ellos.'],
    [/vacío|falta el archivo/i, 'No se recibieron datos. Elige un archivo que tenga al menos una fila de datos.'],
    [/no pude abrir|contraseña/i, 'No se pudo abrir el Excel. Ábrelo en tu equipo y guarda una copia .xlsx sin contraseña.'],
    [/xlsm|macros/i, 'Los archivos con macros no se aceptan. Guarda una copia como .xlsx sin macros.'],
    [/excel antiguo|solo se aceptan|no se acepta este archivo/i, 'Solo se aceptan .xlsx o .csv. Abre el archivo y guárdalo en uno de esos formatos.'],
    [/pesa más de 10 MB/i, 'Pesa más de 10 MB. Divide las filas en archivos más pequeños y conserva los encabezados en cada uno.'],
    [/fecha de corte/i, 'Falta una fecha de corte válida. Indica hasta qué fecha llega el informe.'],
    [/vista es de consulta/i, 'Esta vista es de consulta. Usa la versión habilitada para recibir archivos.'],
    [/error interno/i, 'El procesador no pudo terminar. Vuelve a intentarlo; si se repite, indica al equipo técnico el nombre del archivo.'],
    [/no se pudo leer el archivo enviado/i, 'El envío no incluía un archivo legible. Vuelve a elegir el archivo original.'],
    [/no (se confirmó|confirmó)/i, 'No se confirmó la recepción. Revisa tu conexión y la lista de archivos antes de volver a subirlo.'],
  ];
  return reglas.find(([patron]) => patron.test(mensaje))?.[1]
    ?? 'No se pudo completar la carga. Revisa la lista y vuelve a elegir el archivo; si se repite, avisa a coordinación.';
}
