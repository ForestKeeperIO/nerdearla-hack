# Impacto EIRA (Reto 3) Implementation Plan · versión simplificada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Presidencia de EIRA arme un informe de impacto subiendo los Excel de cada coordinación, sin contar dos veces lo mismo: ni el mismo archivo con otro nombre, ni la misma fila en dos archivos, ni la misma persona con el ID repetido.

**Architecture:** Un solo proceso Node con Hono que entrega páginas HTML ya armadas (sin aplicación de navegador aparte, sin API intermedia, sin compilación) y htmx para las acciones. Los Excel originales son la fuente de verdad en disco; Valkey es el motor: huellas de archivo y de fila para omitir duplicados, conjuntos de personas para conteos exactos, contadores por unidad y un flujo con cada decisión. Las decisiones humanas (misma persona, personas distintas, ligar folio) son un alias que se resuelve al leer; nunca se reescriben conjuntos.

**Tech Stack:** Node 22, TypeScript (tsx), Hono + @hono/node-server, htmx (cdnjs), iovalkey, Valkey 9.2, SheetJS, papaparse, Vitest. Se quitan React, Vite, Recharts, testing-library y jsdom del `package.json`.

**Spec:** Guía de EIRA, sección "RETO 3" y secciones 5 y 6: https://drive.google.com/file/d/1W-t7xGprXyj7PjzC7iCw32aiDgoZGXXl/view. Reglas: https://vibeathon-mexico-2026.devpost.com/rules. Fuentes: `docs/fuentes/`. Tablero visual: `docs/plan-visual.png`.

## Qué cambió respecto a la versión anterior y por qué

Cinco revisiones independientes (hechas con Devin) coincidieron: el plan estaba sobrecargado en superficie, no en idea.

| Antes | Ahora | Motivo |
|---|---|---|
| Servidor + aplicación React + API + SSE | Un proceso que entrega HTML; refresco cada 3 s | Quita cerca de 15 archivos, la compilación y la integración que más falla en vivo |
| 6 tareas, 5 pantallas, unas 30 piezas | 5 tareas, 4 pantallas y una de registro, 12 archivos | Cabe antes de las 15:00 |
| Roles con sesión y contraseña | Selector de rol, declarado como simulado | No aporta al caso de la guía |
| Mover personas entre conjuntos al decidir | Alias resuelto al leer | Decidir cuesta una escritura y es atómico |
| Duplicado = mismo archivo byte a byte | Tres capas: archivo, fila, persona | Es el objetivo real: mismo reporte con otro nombre |
| Docker obligatorio | `npm start`; `compose.yaml` opcional | Menos piezas el día del demo |
| CURP, marginación CONAPO | Fuera | No están en el caso ni en lo que pidió EIRA |

Sobre pasar a Python: se evaluó (FastAPI + pandas, unas 8 piezas). Se descarta porque el costo no estaba en el lenguaje sino en la superficie, el contrato de tipos ya existe en TypeScript, y reescribirlo quema cerca de 45 minutos sin reducir alcance. La simplificación de arriba consigue el mismo tamaño.

## Validado con EIRA (2026-11-21, 11:41)

- Registran en Excel, una fila por evento por persona: nombre, estudio, edad, ciudad, asistencia, tipo de servicio.
- Cada programa lleva su archivo y Presidencia consolida a mano los de tres o más coordinaciones. Es lento y propenso a errores.
- Ya tienen un ID: iniciales de apellido paterno, materno y nombre más fecha de nacimiento (`AAAAMMDD`). Reconocen que puede chocar.
- Los donantes piden personas impactadas, edad promedio y desglose por ciudad; quieren una plantilla base con preguntas extra por aliado.
- Imaginan: subir Excel, filtros de calidad, vista previa, exportar, con calificación en estrellas.
- Pendiente de EIRA: compartir Excel de ejemplo. Los encabezados de este plan son supuestos hasta entonces.

## Cómo se omiten los duplicados

Tres capas, de la más gruesa a la más fina. Las dos primeras las resuelve el sistema solo; la tercera la confirma una persona.

### Capa 1: el mismo archivo

| Caso | Ejemplo | Cómo se detecta | Qué ve la persona |
|---|---|---|---|
| Copia idéntica con otro nombre | `rosa.xlsx` y `reporte_final_2.xlsx` | Huella sha256 de los bytes | "Este archivo ya se cargó el 21 nov como 'rosa.xlsx'. No se vuelve a cargar." |
| Mismo contenido vuelto a guardar | `rosa.xlsx` abierto y guardado en Excel | Huella canónica: sha256 de las huellas de fila ordenadas | "Mismo contenido que 'rosa.xlsx' (archivo vuelto a guardar). No hay nada nuevo." |
| Filas o columnas en otro orden, encabezados renombrados | `Fecha, ID, Nombre…` | Huella canónica | Igual, con la nota "las columnas venían en otro orden". |
| Exportado a CSV | `rosa.csv` | Huella canónica | "Mismo contenido que 'rosa.xlsx', en CSV." |

### Capa 2: la misma fila

Cada fila se reduce a una huella que no depende del archivo: `HMAC(idEira | nombre normalizado | clave de municipio | servicio normalizado | fecha | asistencia | cantidad)`. Al importar, una fila cuya huella ya existe no se vuelve a contar.

| Caso | Ejemplo | Traslape | Qué ve la persona |
|---|---|---|---|
| Versión nueva | `rosa_v2.xlsx` = las filas de antes más 8 | 90 % o más | "Parece una versión nueva de 'rosa.xlsx': 122 filas ya estaban y se omiten; se agregan 8." |
| Dos coordinaciones registraron lo mismo | `nutricion.xlsx` comparte 30 filas con `rosa.xlsx` | 30 a 89 % | "Comparte 30 filas con 'rosa.xlsx'. Se cuentan una sola vez. Revísalas en Calidad si eran servicios distintos." |
| Filas repetidas dentro del archivo | 4 filas copiadas dos veces | — | "4 filas repetidas dentro del archivo: se cuentan una vez." |
| Archivo distinto | menos de 30 % | — | Importación normal; el traslape, si existe, se lista en Calidad. |

Toda fila omitida queda registrada (archivo, número de fila, archivo donde ya estaba) y Presidencia puede restituirla con "Contar de todos modos", que queda en la bitácora.

Límite declarado: una fila corregida (por ejemplo, la fecha) tiene huella nueva y entra como fila nueva. El sistema la señala como "posible corrección" cuando comparte ID y servicio con una fila anterior del mismo programa y difiere solo en un campo, y una persona decide.

### Capa 3: la misma persona

- Mismo ID de EIRA y mismo nombre normalizado: misma persona, sin preguntar.
- Mismo ID y nombre distinto: el sistema pregunta "¿Es la misma persona escrita distinto, o son dos personas con el mismo ID?" y muestra ambos nombres, leídos del Excel original en ese momento. Hasta que alguien decida, cuentan como una.
- Con folio de tarjeta: el folio se liga al ID y esa persona pasa a "con folio".

## Global Constraints

- Envío en Devpost antes de las 16:00 CDMX del 2026-11-21. Corte de funciones a las 15:00. Primer recorrido completo a las 14:20.
- Solo datos ficticios en los archivos internos. Los datos públicos van con fuente y año.
- Nunca presentar una deduplicación estimada como cifra oficial: sin HyperLogLog ni conteos aproximados.
- Unidades no sumables entre sí: `persona`, `atencion`, `estudio`, `participacion`, `entrega_insumo`.
- Todo indicador lleva `valor`, `unidad`, `definicion`, `fechaCorte`, `fuentes`, `denominador` (o `null`), `advertencias` y `calculo` (comando de Valkey y milisegundos).
- En Valkey no se guarda ningún nombre, ID de EIRA en claro ni teléfono: solo valores HMAC-SHA256 con `IMPACTO_HMAC_KEY`. Tampoco en anomalías ni pares: esos guardan archivo, número de fila y regla. Los nombres se leen del Excel original solo para mostrarlos.
- Palabras permitidas en interfaz y README: "seudonimizado". Prohibidas: "anónimo", "cifrado", "cumple", "certificado", "verificación de identidad". La tarjeta es "registro con tarjeta", no prueba de identidad.
- Etiquetas de certeza en pantalla: "Con folio", "Con ID de EIRA", "Sin identificar" (valores internos `verificada`, `probable`, `sin_identificar`).
- Subida: máximo 10 MB y 20,000 filas; se rechaza `.xlsm`. Exportación CSV con BOM y con `'` delante de toda celda que empiece con `=`, `+`, `-` o `@`.
- Valkey escucha solo en `127.0.0.1` y con contraseña (`VALKEY_PASSWORD`). El Stream `imp:ajustes` nunca se recorta.
- Celdas de personas con valor menor a 5 se muestran como `<5`.
- Folio: `EIRA-XXXX-XXXX`, opaco, con verificador (`shared/folio.ts`, ya hecho). La tarjeta NFC lleva solo el folio.
- Valkey se nombra "Valkey" en código, README y pitch; nunca "Redis". Cliente: `import { Valkey } from 'iovalkey'`.
- SheetJS desde `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, leyendo con `cellDates: true`.
- Interfaz en español, texto de 16 px o más, estados con texto además de color. Repositorio público, MIT, README con tabla "Implementado / Simulado / Para piloto".

## Alcance

| Función | Decisión | Minutos |
|---|---|---|
| Importar con mapeo propuesto y probabilidad | Imprescindible | 35 |
| Duplicados en tres capas | Imprescindible | 40 |
| Calificación en estrellas | Imprescindible | 15 |
| Colisiones de ID con decisión humana | Imprescindible | 20 |
| Indicadores por unidad, personas con rango, edad promedio, desglose por ciudad | Imprescindible | 40 |
| Informe con notas al pie, CSV e impresión | Imprescindible | 25 |
| Cobertura contra población de INEGI | Deseable 1 | 20 |
| Tercer archivo (tres coordinaciones) | Deseable 2 | 15 |
| Registro con tarjeta NFC y folio tecleado | Deseable 3 | 25 |
| Plantilla de informe por audiencia | Deseable 4 | 15 |
| CURP, marginación CONAPO, sesiones con contraseña, SSE, Docker obligatorio | Fuera | — |

## Review Focus

1. El mismo reporte subido dos veces con otro nombre, vuelto a guardar o en CSV: no cambia ninguna cifra y el mensaje nombra el archivo original. Prueba en Tareas 2 y 3.
2. Versión nueva con filas agregadas: solo entran las nuevas y el mensaje dice cuántas. Prueba en Tarea 3.
3. Excel real y sucio: encabezados en la fila 2 o 3, fila de totales al final, celdas combinadas, fechas como texto o como número de serie. Prueba en Tarea 2.
4. Dos personas con el mismo ID: cuentan como una hasta que alguien decide; al separarlas la cifra sube en 1 y queda en la bitácora. Prueba en Tarea 3.
5. Alguien intenta sumar atenciones con participaciones: recibe un error explicado, no un número. Prueba en Tarea 3.

---

## File Structure

| Ruta | Responsabilidad | Tarea |
|---|---|---|
| `shared/types.ts`, `server/claves.ts` | Contrato y nombres de claves (actualizar) | 1 |
| `scripts/datos-sinteticos.ts` | Excel de prueba y `sinteticos/esperado.json` | 1 |
| `server/normalizar.ts` | Texto, fechas, municipio, ID de EIRA, miembro, huella de fila | 2 |
| `server/importar.ts` | Leer Excel y CSV, proponer mapeo, convertir a registros, calificar | 2 |
| `server/motor.ts` | Duplicados, ingesta, indicadores, decisiones, bitácora | 3 |
| `server/vistas.ts` | Plantillas HTML de las pantallas | 4 |
| `server/app.ts`, `server/main.ts` | Rutas y arranque | 4 |
| `web/estilos.css`, `web/nfc.js` | Estilos y lectura de tarjeta | 4 |
| `README.md`, `docs/devpost.md`, `compose.yaml` | Entrega | 5 |

Las Tareas 2, 3 y 4 corren en paralelo tras la Tarea 1, cada una en su rama (`t2-importar`, `t3-motor`, `t4-vistas`).

---

### Task 1: Contrato, claves y datos de prueba (en serie, 15 min)

**Files:**
- Modify: `shared/types.ts`, `server/claves.ts`, `package.json` (quitar React, Vite, Recharts, testing-library, jsdom; script `dev` = `tsx watch server/main.ts`), `scripts/valkey-local.sh` (agregar `--requirepass "$VALKEY_PASSWORD"`)
- Delete: `vite.config.ts`
- Create: `scripts/datos-sinteticos.ts`, `sinteticos/*.xlsx`, `sinteticos/esperado.json`

**Interfaces — cambios a `shared/types.ts`:**

```ts
export type Role = 'coordinacion' | 'presidencia';
export type Campo = 'folio' | 'idEira' | 'nombreCompleto' | 'edad' | 'municipio' | 'servicio' | 'fecha' | 'asistencia' | 'cantidad' | 'ignorar';
export type ReglaCalidad = 'faltante' | 'fecha_invalida' | 'fecha_futura' | 'municipio_desconocido' | 'id_invalido'
  | 'edad_inconsistente' | 'fila_repetida' | 'fila_ya_cargada' | 'posible_correccion' | 'discrepancia_total';
export interface Registro {            // se agrega:
  huellaFila: string;                  // HMAC de la fila normalizada
  miembro: string | null;              // `eira:<hmacId>~<hmacNombre8>` o `id:<folio>`; lo que entra a los conjuntos
}                                      // se elimina personaClave; certeza se conserva
export interface CalidadArchivo { estrellas: 1|2|3|4|5; puntaje: number; identificados: number; completos: number; sinAnomalias: number; motivos: string[]; }
export type NivelDuplicado = 'identico' | 'mismo_contenido' | 'version_nueva' | 'traslape_parcial' | 'distinto';
export interface VeredictoArchivo {
  fuenteId: string | null;             // null cuando no se importa
  nivel: NivelDuplicado; fuenteOriginal: { id: string; nombreArchivo: string; cargadaEn: string } | null;
  filasTotales: number; filasYaCargadas: number; filasNuevas: number; filasRepetidasDentro: number;
  porcentajeTraslape: number; mensaje: string; seImporta: boolean;   // false en 'identico' y 'mismo_contenido'
}
export interface ParPersona {          // sustituye a ParDuplicado
  id: string; miembroA: string; miembroB: string;
  refA: { fuenteId: string; fila: number }; refB: { fuenteId: string; fila: number };
  estado: 'pendiente' | 'misma' | 'distinta';
}
export interface Ajuste { id: string; en: string; por: string; tipo: 'importacion' | 'omision' | 'restitucion' | 'persona' | 'folio' | 'asistencia'; detalle: string; }
```

`Indicador`, `PersonasUnicas`, `Cruce`, `FilaCobertura`, `Fuente`, `Anomalia`, `Filtro` y `MapeoPropuesto` quedan como están; `Anomalia.detalle` nunca lleva nombres.

**Interfaces — `server/claves.ts` completo:**

| Función | Clave | Tipo | Contenido |
|---|---|---|---|
| `kHuellas()` | `imp:huellas` | Hash | sha256 del archivo → id de fuente |
| `kHuellasCanon()` | `imp:huellas:canon` | Hash | huella canónica → id de fuente |
| `kFilas(fuenteId)` | `imp:filas:<fuenteId>` | Set | huellas de fila del archivo |
| `kFilasTodas()` | `imp:filas:todas` | Hash | huella de fila → `<fuenteId>:<fila>` donde se contó |
| `kOmitidas(fuenteId)` | `imp:omitidas:<fuenteId>` | List | JSON `{ fila, huella, yaEn }` |
| `kFuente(id)`, `kFuentes()` | `imp:fuente:<id>`, `imp:fuentes` | Hash, Set | metadatos |
| `kRegistro(id)` | `imp:reg:<id>` | Hash | un `Registro` |
| `kPersonas(dim, valor)` | `imp:per:<dim>:<valor>` | Set | miembros; `dim` ∈ `programa`, `municipio`, `periodo`, `servicio`, `todas` |
| `kValores(dim)` | `imp:val:<dim>` | Set | valores vistos, para los filtros |
| `kAlias()` | `imp:alias` | Hash | miembro o canónica → canónica |
| `kNac()` | `imp:nac` | Hash | miembro → `AAAA-MM-DD` |
| `kConteo(unidad)` | `imp:cnt:<unidad>` | Hash | `<programa>\|<municipio>\|<periodo>\|<servicio>` → suma |
| `kSinIdentificar()` | `imp:sinid` | Hash | mismo campo → registros sin persona |
| `kInasistencias()` | `imp:inasist` | Hash | id de fuente → número |
| `kAnomalias(fuenteId)` | `imp:anom:<fuenteId>` | List | `Anomalia` en JSON |
| `kPares()` | `imp:pares` | Hash | id → `ParPersona` en JSON |
| `kAjustes()` | `imp:ajustes` | Stream | cada `Ajuste` |
| `kDenominador(ind)`, `kDenominadorMeta(ind)` | `imp:den:<ind>`, `imp:den-meta:<ind>` | Hash | municipio → valor; fuente y año |
| `kCobertura()` | `imp:rank:cobertura` | Sorted Set | municipio → porcentaje |

Se eliminan `kDuplicados`, `kCertezaRegistros`, `kEventos`, `kSesion`.

**Datos de prueba** (`npm run datos`, semilla fija):

| | `tamizaje-rosa.xlsx` | `salud-que-florece.xlsx` | `nutricion.xlsx` (deseable 2) |
|---|---|---|---|
| Programa y unidad | Tamizaje Rosa, `atencion` | Salud que Florece, `participacion` | Nutrición, `atencion` |
| Filas de datos | 130: 120 asistencias distintas, 6 inasistencias y 4 filas repetidas | 84: 80 y 4 | 42: 40 y 2 |
| Encabezados | `ID`, `Nombre`, `Estudio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha` | `Id usuario`, `NOMBRE COMPLETO`, `Taller`, `EDAD`, `Ciudad`, `Asistió`, `fecha_evento` | `ID`, `Nombre`, `Tipo de servicio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha` |
| Forma del Excel | Encabezados en la fila 1; fechas `DD/MM/AAAA` como texto | Título en la fila 1, encabezados en la fila 3, fila "TOTAL" al final; fechas de Excel | Encabezados en la fila 1 |
| Sembrado | 3 fechas inválidas, 2 ciudades desconocidas, 3 ID inválidos, 8 filas sin ID | 2 fechas futuras, 1 ciudad desconocida, 12 filas sin ID, 5 edades inconsistentes | 30 filas idénticas a filas de `tamizaje-rosa.xlsx` |
| Entre archivos | 15 personas con el mismo ID en los dos primeros; 2 colisiones verdaderas (mismo ID, personas distintas); 3 variantes de escritura (misma persona, nombre escrito distinto) | | |

Además genera cuatro derivados del primero para probar duplicados: `reporte_final_2.xlsx` (bytes idénticos), `tamizaje-rosa-reguardado.xlsx` (mismas celdas, otros bytes, columnas en otro orden), `tamizaje-rosa.csv`, y `tamizaje-rosa_v2.xlsx` (las mismas filas más 8 asistencias nuevas).

`sinteticos/esperado.json` guarda la verdad con la que se construyeron los archivos, no lo que calcule el importador: por archivo `{ filas, asistencias, inasistencias, sinIdentificar, repetidasDentro, anomalias }` y globales `{ personasConId, registrosSinIdentificar, cruceTamizajeFlorece, colisiones: 2, variantes: 3, edadPromedio, filasCompartidasNutricion: 30 }`.

- [ ] **Step 1:** Aplicar los cambios a `shared/types.ts` y `server/claves.ts`; `npx tsc --noEmit` sin errores.
- [ ] **Step 2:** Escribir `scripts/datos-sinteticos.ts`; `npm run datos`; abrir `esperado.json` y comprobar a mano: 120, 80, `colisiones: 2`, `variantes: 3`.
- [ ] **Step 3:** Limpiar `package.json` y borrar `vite.config.ts`; `npm test` sigue pasando la prueba de folio.
- [ ] **Step 4:** Commit `chore: simplify stack, update contract, add synthetic data` y push.

### Task 2: Leer, mapear, normalizar y calificar (paralelo)

**Files:**
- Create: `server/normalizar.ts`, `server/importar.ts`, `server/catalogo-municipios.ts`
- Test: `server/normalizar.test.ts`, `server/importar.test.ts`

**Interfaces — Produces:**
- `normalizarTexto(s: string): string` — minúsculas, sin diacríticos, `ñ`→`n`, sin partículas `de`, `del`, `la`, `las`, `los`, espacios colapsados
- `parseFecha(v: unknown): string | null` — `DD/MM/AAAA`, `AAAA-MM-DD`, `Date`, o número de serie entre 20000 y 60000
- `claveMunicipio(nombre: string): string | null` — catálogo de Jalisco (`publicos/mgem14.json`) con alias (`Ciudad Guzmán`, `Cd. Guzmán` → `14023`)
- `parseIdEira(id: string): { iniciales: string; fechaNacimiento: string } | null` — `^[A-ZÑ]{3}\d{8}$` con fecha válida; tolera minúsculas, espacios y guiones
- `miembroDe(d: { folio?: string | null; idEira?: string | null; nombre?: string | null }, hmacKey: string): { miembro: string | null; certeza: Certeza }` — folio válido → `id:<folio>`; ID válido → `eira:<hmac(id)>~<primeros 8 hex de hmac(nombre normalizado)>`; si no, `null`
- `huellaFila(r: { idEira: string | null; nombre: string | null; municipioClave: string | null; servicio: string | null; fecha: string | null; asistio: boolean; cantidad: number }, hmacKey: string): string`
- `huellaCanonica(huellas: string[]): string` — sha256 de las huellas ordenadas y unidas con salto de línea
- `leerArchivo(buf: Buffer, nombre: string): { hoja: string; filaEncabezados: number; encabezados: string[]; filas: Record<string, unknown>[]; filasExcluidas: { fila: number; motivo: 'total' | 'vacia' }[] }`
- `proponerMapeo(encabezados: string[]): MapeoPropuesto[]`
- `aRegistros(filas, mapeo: Mapeo, fuente: Fuente, hmacKey: string): { registros: Registro[]; anomalias: Anomalia[]; inasistencias: number }` — devuelve un registro por fila con asistencia, incluidas las repetidas; omitir repetidas es trabajo del motor
- `calificar(registros: Registro[], anomalias: Anomalia[], totalFilas: number): CalidadArchivo`

- [ ] **Step 1:** Pruebas que fallan:

```ts
test('fechas', () => {
  expect(parseFecha('12/03/1984')).toBe('1984-03-12');
  expect(parseFecha(30753)).toBe('1984-03-12');
  expect(parseFecha('31/02/2026')).toBeNull();
});
test('municipio con alias', () => { expect(claveMunicipio('CD. GUZMAN')).toBe('14023'); expect(claveMunicipio('Villa Inexistente')).toBeNull(); });
test('ID de EIRA', () => {
  expect(parseIdEira(' elm-19840312 ')).toEqual({ iniciales: 'ELM', fechaNacimiento: '1984-03-12' });
  expect(parseIdEira('ELM19841340')).toBeNull();
});
test('miembro: mismo ID y nombre con distinta escritura dan el mismo miembro', () => {
  const k = 'k'.repeat(32);
  const a = miembroDe({ idEira: 'ELM19840312', nombre: 'María  Ejemplo López' }, k);
  const b = miembroDe({ idEira: 'elm19840312', nombre: 'MARIA EJEMPLO LOPEZ' }, k);
  expect(a).toEqual(b); expect(a.certeza).toBe('probable'); expect(a.miembro).toMatch(/^eira:[0-9a-f]{64}~[0-9a-f]{8}$/);
  const c = miembroDe({ idEira: 'ELM19840312', nombre: 'Elena Luna Mora' }, k);
  expect(c.miembro!.split('~')[0]).toBe(a.miembro!.split('~')[0]); expect(c.miembro).not.toBe(a.miembro);
  expect(miembroDe({ nombre: 'María Ejemplo' }, k)).toEqual({ miembro: null, certeza: 'sin_identificar' });
});
test('la huella de fila no depende de mayúsculas, acentos ni formato de fecha', ...);
test('la huella canónica no depende del orden de las filas', ...);
test('encuentra encabezados en la fila 3 y excluye la fila TOTAL', () => {
  const r = leerArchivo(leer('salud-que-florece.xlsx'), 'salud-que-florece.xlsx');
  expect(r.filaEncabezados).toBe(3); expect(r.filas).toHaveLength(84);
  expect(r.filasExcluidas).toContainEqual(expect.objectContaining({ motivo: 'total' }));
});
test('propone el mapeo de los dos archivos con probabilidad', () => {
  const m = Object.fromEntries(proponerMapeo(['ID','Nombre','Estudio','Edad','Ciudad','Asistencia','Fecha']).map(x => [x.encabezado, x.campo]));
  expect(m).toEqual({ ID:'idEira', Nombre:'nombreCompleto', Estudio:'servicio', Edad:'edad', Ciudad:'municipio', Asistencia:'asistencia', Fecha:'fecha' });
  const raro = proponerMapeo(['Fcha atencion'])[0];
  expect(raro.campo).toBe('fecha'); expect(raro.porConfirmar).toBe(true);
});
test('cada archivo coincide con esperado.json', () => {
  for (const [nombre, e] of Object.entries(esperado.archivos)) {
    const { registros, anomalias, inasistencias } = importarSintetico(nombre);
    expect(registros).toHaveLength(e.asistencias + e.repetidasDentro); expect(inasistencias).toBe(e.inasistencias);
    for (const [regla, n] of Object.entries(e.anomalias)) expect(cuenta(anomalias, regla)).toBe(n);
  }
});
test('los derivados del primer archivo tienen su misma huella canónica, salvo la versión 2', ...);
test('ninguna anomalía contiene un nombre', ...);
test('calificar: perfecto = 5 estrellas; 30 % sin ID baja y el motivo lo dice', ...);
```

- [ ] **Step 2:** Correr, esperado FAIL. Implementar. Decisiones fijas: la fila de encabezados es, entre las primeras 10, la que más celdas coinciden con el diccionario de sinónimos; se excluyen las filas cuya primera celda con texto empieza por `total` o `subtotal`, y las vacías; las celdas combinadas se rellenan hacia abajo; se usa la hoja con mejor puntaje de encabezados. `proponerMapeo`: sinónimo exacto = probabilidad 1.0; si no, la mejor similitud Jaro-Winkler contra los sinónimos; `porConfirmar` si es menor a 0.90. `calificar`: `puntaje = 0.4 × identificados + 0.3 × sinAnomalias + 0.3 × completos` (`completos` = porcentaje de filas con fecha, municipio y servicio); estrellas: <50 = 1, <65 = 2, <80 = 3, <92 = 4, si no 5.
- [ ] **Step 3:** Correr, esperado PASS. Commit `feat: read, map, normalize and rate spreadsheets`.

### Task 3: Motor en Valkey (paralelo)

**Files:**
- Create: `server/motor.ts`, `server/publicos.ts`
- Test: `server/motor.test.ts` (Valkey real, base 15, `FLUSHDB` antes de cada prueba)

**Interfaces — Produces:**
- `evaluarArchivo(v, d: { huellaBytes: string; huellasFila: string[] }): Promise<VeredictoArchivo>` — no escribe nada
- `ingerir(v, fuente: Fuente, registros: Registro[], anomalias: Anomalia[], inasistencias: number, huellaBytes: string, por: string): Promise<VeredictoArchivo>`
- `restituirFila(v, fuenteId: string, fila: number, por: string): Promise<void>`
- `conteo(v, unidad, f: Filtro): Promise<Indicador>`
- `personasUnicas(v, f: Filtro): Promise<PersonasUnicas>`
- `cruce(v, programaA: string, programaB: string): Promise<Cruce>`
- `edadPromedio(v, f: Filtro, fechaCorte: string): Promise<Indicador>`
- `sumar(a: Indicador, b: Indicador): Indicador` — lanza `ErrorUnidades`
- `paresPendientes(v): Promise<ParPersona[]>`; `decidirPar(v, id: string, decision: 'misma' | 'distinta', por: string): Promise<void>`
- `ligarFolio(v, d: { folio: string; idEira: string; por: string }, hmacKey: string): Promise<void>`
- `ajustes(v): Promise<Ajuste[]>`
- `cargarDenominadores(v, indicador: string, filas: { municipioClave: string; valor: number }[], meta: { fuente: string; anio: number; etiqueta: string }): Promise<void>`; `cobertura(v, f: Filtro): Promise<FilaCobertura[]>`

**Reglas del motor:**

| Operación | Cómo |
|---|---|
| Evaluar archivo | `HGET imp:huellas` (idéntico); `HGET imp:huellas:canon` (mismo contenido); si no, `HMGET imp:filas:todas` con todas las huellas y contar cuántas existen. El traslape se mide contra la fuente que más filas comparte: 90 % o más = `version_nueva`; 30 a 89 % = `traslape_parcial`; menos = `distinto` |
| Ingerir | Por fila: `HSETNX imp:filas:todas <huella> <fuente:fila>`; si devuelve 0, la fila va a `imp:omitidas` y no cuenta. Las que entran: `HSET` del registro, `SADD` a los conjuntos, `HINCRBYFLOAT` del conteo, `HSET imp:nac`. Las huellas del archivo se registran en `imp:huellas` e `imp:huellas:canon` **al final**, en el mismo `MULTI` que el `XADD` a la bitácora, para que un fallo a medias no deje el archivo marcado |
| Canónica de un miembro | `alias[miembro]` si existe; si no, el prefijo antes de `~`. Se resuelve hasta 3 saltos |
| Personas únicas | `SINTER` de los conjuntos del filtro (o `SMEMBERS` si no hay filtro), `HMGET imp:alias`, y canónicas distintas contadas en el proceso. `calculo.comando` informa el `SINTER` y el `HMGET` |
| Certeza de una canónica | Prefijo `id:` = con folio; `eira:` = con ID |
| Pares | Al ingerir: dos miembros con el mismo prefijo y distinto sufijo generan un `ParPersona` pendiente |
| Decidir "distinta" | `HSET imp:alias <miembroB> <prefijo>#2` + `XADD`, en `MULTI` |
| Decidir "misma" | marca el par; no cambia cifras |
| Ligar folio | `HSET imp:alias <prefijo eira> id:<folio>` + `XADD`, en `MULTI` |
| Restituir fila | cuenta la fila omitida con huella `<huella>#<fuente:fila>` y `XADD` |

- [ ] **Step 1:** Pruebas que fallan (`importar(nombre)` es un auxiliar de la prueba que lee el sintético con la Tarea 2 y llama a `ingerir`; mientras la Tarea 2 no exista, la prueba construye los registros a partir de `esperado.json`):

```ts
test('copia con otro nombre: idéntico, no se importa, nombra el original', async () => {
  await importar('tamizaje-rosa.xlsx');
  const r = await importar('reporte_final_2.xlsx');
  expect(r).toMatchObject({ nivel: 'identico', seImporta: false, fuenteOriginal: { nombreArchivo: 'tamizaje-rosa.xlsx' } });
  expect((await conteo(v, 'atencion', {})).valor).toBe(120);
});
test('vuelto a guardar y en CSV: mismo contenido', async () => {
  await importar('tamizaje-rosa.xlsx');
  expect((await importar('tamizaje-rosa-reguardado.xlsx')).nivel).toBe('mismo_contenido');
  expect((await importar('tamizaje-rosa.csv')).nivel).toBe('mismo_contenido');
  expect((await conteo(v, 'atencion', {})).valor).toBe(120);
});
test('versión nueva: solo entran las filas nuevas', async () => {
  await importar('tamizaje-rosa.xlsx');
  const r = await importar('tamizaje-rosa_v2.xlsx');
  expect(r).toMatchObject({ nivel: 'version_nueva', filasNuevas: 8, seImporta: true });
  expect((await conteo(v, 'atencion', {})).valor).toBe(128);
});
test('filas repetidas dentro del archivo se cuentan una vez', async () => {
  const r = await importar('tamizaje-rosa.xlsx');
  expect(r.filasRepetidasDentro).toBe(4);
  expect((await conteo(v, 'atencion', {})).valor).toBe(120);
});
test('traslape parcial entre coordinaciones: se cuentan una vez y se puede restituir', async () => {
  await importar('tamizaje-rosa.xlsx');
  const r = await importar('nutricion.xlsx');
  expect(r).toMatchObject({ nivel: 'traslape_parcial', filasYaCargadas: 30 });
  const antes = (await conteo(v, 'atencion', {})).valor as number;
  await restituirFila(v, r.fuenteId!, primeraOmitida, 'presi1');
  expect((await conteo(v, 'atencion', {})).valor).toBe(antes + 1);
  expect((await ajustes(v)).at(-1)).toMatchObject({ tipo: 'restitucion', por: 'presi1' });
});
test('un fallo a media ingesta no deja el archivo marcado como cargado', ...);
test('conteos del caso de la guía', async () => {
  await importar('tamizaje-rosa.xlsx'); await importar('salud-que-florece.xlsx');
  expect((await conteo(v, 'atencion', {})).valor).toBe(120);
  expect((await conteo(v, 'participacion', {})).valor).toBe(80);
});
test('personas únicas y cruce coinciden con esperado.json', async () => {
  const p = await personasUnicas(v, {});
  expect(p.probables).toBe(esperado.personasConId);
  expect(p.registrosSinIdentificar).toBe(esperado.registrosSinIdentificar);
  expect(p.maximo).toBe(p.minimo + p.registrosSinIdentificar);
  expect((await cruce(v, 'Tamizaje Rosa', 'Salud que Florece')).enAmbos).toBe(esperado.cruceTamizajeFlorece);
});
test('colisión: una sola persona hasta decidir; "distinta" suma 1 y queda en bitácora', async () => {
  expect(await paresPendientes(v)).toHaveLength(esperado.colisiones + esperado.variantes);
  const antes = (await personasUnicas(v, {})).probables;
  await decidirPar(v, parColision.id, 'distinta', 'presi1');
  expect((await personasUnicas(v, {})).probables).toBe(antes + 1);
  await decidirPar(v, parVariante.id, 'misma', 'presi1');
  expect((await personasUnicas(v, {})).probables).toBe(antes + 1);
  expect((await ajustes(v)).filter(a => a.tipo === 'persona')).toHaveLength(2);
});
test('ligar folio pasa a la persona a "con folio" sin cambiar el total', async () => {
  const antes = await personasUnicas(v, {});
  await ligarFolio(v, { folio: FOLIO, idEira: esperado.idConocido, por: 'coord1' }, KEY);
  const d = await personasUnicas(v, {});
  expect([d.verificadas, d.probables, d.minimo]).toEqual([antes.verificadas + 1, antes.probables - 1, antes.minimo]);
});
test('sumar unidades distintas lanza error explicado', () => {
  expect(() => sumar(atenciones, participaciones)).toThrow(/no se pueden sumar: atencion y participacion/);
});
test('edad promedio coincide con esperado.json', ...);
test('ningún valor en imp:* contiene un nombre ni un ID en claro', ...);
test('personas menores a 5 se devuelven como "<5"', ...);
```

`esperado.json` incluye además `idConocido` (un ID de EIRA presente en los datos) para la prueba del folio.

- [ ] **Step 2:** Correr, esperado FAIL. Implementar con la tabla de reglas.
- [ ] **Step 3:** `server/publicos.ts`: cargar `publicos/jalisco_mun_denominadores_2020.csv` como denominador `mujeres_25_64` (control: `14023` = 30,089). Solo si se llega al deseable 1.
- [ ] **Step 4:** Correr, esperado PASS. Commit `feat: Valkey engine with three-layer duplicate handling`.

### Task 4: Pantallas y rutas (paralelo, contra las firmas de las Tareas 2 y 3)

**Files:**
- Create: `server/vistas.ts`, `server/app.ts`, `server/main.ts`, `web/estilos.css`, `web/nfc.js`
- Test: `server/app.test.ts`

**Rutas (todas devuelven HTML salvo las marcadas):**

| Ruta | Qué hace |
|---|---|
| `GET /` | Paso 1, Subir: zona para soltar archivos y lista de archivos cargados con sus estrellas |
| `POST /previa` | Lee el archivo y devuelve el fragmento del paso 2: veredicto de duplicado, estrellas con motivos, mapeo propuesto (los "por confirmar" resaltados), 5 filas de muestra, y campos programa, unidad y fecha de corte |
| `POST /importar` | Ingiere y redirige al Tablero con el mensaje del veredicto |
| `GET /calidad` | Anomalías por regla y fila; filas omitidas con "Contar de todos modos"; pares de persona con ambos nombres y botones "Es la misma persona" y "Son dos personas" |
| `POST /pares/:id`, `POST /restituir` | Aplican la decisión y devuelven el fragmento actualizado |
| `GET /tablero` | Filtros; una tarjeta por unidad; personas con rango; edad promedio; desglose por ciudad; cruce entre programas; cobertura (deseable 1). Cada tarjeta despliega "Cómo se calculó" |
| `GET /tablero/cifras` | Fragmento que htmx pide cada 3 s |
| `GET /informe` | Vista imprimible con notas al pie, advertencias y bitácora |
| `GET /informe.csv` | CSV (texto) |
| `POST /sumar` | Devuelve el indicador o el error explicado |
| `GET /registro`, `POST /registro` | Deseable 3: folio por tarjeta o tecleado, ligado a un ID de EIRA |
| `GET /salud` | JSON `{ ok, valkey, claves }` |

El rol se elige en un selector de la cabecera y viaja en una cookie; `coordinacion` no ve los botones de decisión ni el informe consolidado. Se declara como simulado.

- [ ] **Step 1:** Pruebas que fallan (con `app.request`): subir `.xlsm` → 400; archivo de más de 10 MB → 413; subir el mismo archivo dos veces → la segunda respuesta contiene "ya se cargó" y el nombre del original; `/informe.csv` no contiene ningún nombre sembrado y una celda que empieza con `=` sale con `'` delante; `/sumar` con unidades distintas → 422 con el texto del error; con rol `coordinacion`, `POST /pares/:id` → 403.
- [ ] **Step 2:** Implementar. La cabecera muestra los cuatro pasos de EIRA: Subir → Calidad → Vista previa → Exportar. Barras del desglose con CSS, sin biblioteca de gráficas. `web/nfc.js`: si existe `NDEFReader`, botón "Acercar tarjeta" que lee el primer registro de texto y llena el campo de folio; si no, solo el campo.
- [ ] **Step 3:** Correr, esperado PASS. Commit `feat: server-rendered screens and routes`.

### Task 5: Integración, despliegue y entrega

- [ ] **Step 1:** Integrar las tres ramas en `main`; `npm test` completo en verde.
- [ ] **Step 2 (14:20):** Recorrido del caso: subir los dos archivos → estrellas y mapeo → 120 y 80 separados → subir `reporte_final_2.xlsx` y ver "ya se cargó" → subir `tamizaje-rosa_v2.xlsx` y ver "se agregan 8" → Calidad: resolver una colisión y ver subir la cifra → intentar sumar unidades → informe y CSV.
- [ ] **Step 3:** Deseables en orden (cobertura, tercer archivo, tarjeta, plantilla) hasta las 15:00.
- [ ] **Step 4:** HTTPS: `compose.yaml` con Caddy para AWS (Ian), o un túnel desde este servidor como respaldo. `README.md`: qué resuelve; cómo levantarlo; recorrido; cómo se omiten duplicados (las tres capas con ejemplos); qué hace Valkey y qué pasa si se pierde (se reconstruye reimportando); tabla Implementado / Simulado / Para piloto; privacidad con sus límites (seudonimización, no anonimato; el ID de EIRA tiene poca entropía); costos; supuestos validados con EIRA; preguntas abiertas; cómo se usó Devin; fuentes.
- [ ] **Step 5:** 15:00 corte; video de respaldo de 90 s; 15:20 envío a Devpost; 15:40 ensayos.

---

# Parte B. Estrategia

## La idea en una frase

Sube los Excel de cada coordinación y obtén el informe, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.

## Preguntas para EIRA sobre duplicados

| # | Pregunta | Qué fija |
|---|---|---|
| 1 | "Cuando dos coordinaciones atienden la misma jornada, ¿cada una registra a la paciente en su Excel? ¿Eso es un servicio contado dos veces o son dos servicios distintos?" | Si el traslape entre archivos se omite por defecto o solo se avisa |
| 2 | "¿Les ha pasado que dos personas manden el mismo Excel a Presidencia con distinto nombre, o que llegue una versión corregida? ¿Cómo se dieron cuenta?" | Los mensajes y el caso que abre el demo |
| 3 | "Si llegan dos versiones del mismo archivo, ¿cuál manda: la más reciente o la que Presidencia ya revisó?" | Si una versión nueva solo agrega filas o reemplaza |
| 4 | "¿Sus Excel traen título arriba, fila de totales al final u hojas de resumen además de las filas?" | La lectura del archivo |
| 5 | "Cuando corrigen una fila, ¿qué dato no cambia nunca: el ID, la fecha, el servicio?" | Cómo reconocer una corrección en vez de una fila nueva |
| 6 | "¿Nos comparten hoy dos Excel reales sin datos, solo con encabezados?" | Los encabezados y la forma de los archivos de prueba |

Orden si hay poco tiempo: 6, 1, 2, 3, 4, 5.

## Qué mostrar a cada juez

| Juez | Momento |
|---|---|
| Roberto Luna Rojas (Valkey) | Cada cifra despliega su comando y sus milisegundos; las huellas de fila viven en Valkey; por qué no HyperLogLog |
| Martí Cristobal | "A medio día quitamos la mitad de la arquitectura: un proceso, sin API intermedia. Las decisiones son un alias, no una reescritura" |
| Valeria Rivera Contreras | Sin nombres en Valkey, límites de subida, contraseña, y lo que no afirmamos: seudonimizado, no anónimo |
| Gael Hernández (Cognition) | Cinco revisiones del plan hechas con Devin en paralelo, documentadas en el README |
| Ximena Cruz, EIRA | Sus cuatro pasos y sus palabras: subir, calidad, vista previa, exportar, con estrellas |

## Pitch de 2 minutos

- 0:00–0:15 "Presidencia de EIRA junta a mano los Excel de cada coordinación. A veces llega el mismo reporte dos veces con otro nombre, y su ID puede repetirse entre dos personas."
- 0:15–0:40 Subir dos Excel: estrellas, mapeo propuesto, 120 atenciones y 80 participaciones por separado.
- 0:40–1:05 Subir el mismo reporte con otro nombre: "ya se cargó como…". Subir la versión 2: "se agregan 8".
- 1:05–1:30 Calidad: dos personas con el mismo ID; se separan y la cifra sube en uno, con bitácora.
- 1:30–1:45 Informe: personas, edad promedio, por ciudad; "cómo se calculó" con el comando de Valkey.
- 1:45–2:00 Qué es real y qué simulado; un comando para levantarlo; el costo.

## Sin verificar

- Los encabezados y la forma real de los Excel de EIRA.
- Si el traslape entre coordinaciones es error o son servicios distintos (pregunta 1); hasta saberlo, se cuenta una vez y se puede restituir.
- Tipo de los dos dispositivos NFC y si hay un Android con Chrome; por eso la tarjeta es el deseable 3.
- Que htmx desde CDN cargue en la red del evento; si no, se sirve una copia local.
- Las revisiones de Devin fueron de solo lectura sobre el plan; ninguna ejecutó código.
