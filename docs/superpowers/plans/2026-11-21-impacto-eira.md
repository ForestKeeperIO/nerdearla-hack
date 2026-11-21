# Impacto EIRA (Reto 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una herramienta que importa archivos de distintos programas de EIRA, los lleva a un modelo común, señala problemas de calidad y produce indicadores e informes donde cada cifra dice de dónde sale, qué cuenta y con qué certeza, demostrando el caso de la guía (120 atenciones y 80 participaciones con personas repetidas).

**Architecture:** Los archivos originales son la fuente de verdad y quedan en disco. Valkey es el motor de cálculo: cada registro importado alimenta conjuntos de personas por dimensión, contadores por unidad y un flujo de ajustes; los indicadores se responden con operaciones de conjuntos exactas, nunca con estimaciones. Una persona se identifica por niveles de certeza: **verificada** por folio de tarjeta NFC o CURP, **probable** por el ID que EIRA ya usa (iniciales más fecha de nacimiento), o **sin identificar**; las personas únicas se reportan como cifra verificada más un rango, no como un solo número.

**Tech Stack:** Node 22, TypeScript, Hono + @hono/node-server, iovalkey, Valkey 8, papaparse, SheetJS (`xlsx` desde cdn.sheetjs.com), React 18 + Vite, Recharts, Vitest.

**Spec:** Guía de EIRA, sección "RETO 3" y secciones 5 y 6: https://drive.google.com/file/d/1W-t7xGprXyj7PjzC7iCw32aiDgoZGXXl/view. Reglas: https://vibeathon-mexico-2026.devpost.com/rules. Este plan reemplaza a los dos anteriores del mismo día.

## Validado con EIRA (2026-11-21, 11:41)

Notas de la conversación con el equipo de EIRA. Donde esta sección contradiga a otra parte del plan, manda esta.

**Lo que dijeron**

- Registran en Excel, una fila por evento por persona. Columnas típicas: nombre, estudio, edad, ciudad, asistencia y tipo de servicio (por ejemplo, nutrióloga).
- Cada programa lleva su propio archivo y Presidencia los consolida a mano. El dolor principal es concentrar los Excel de tres o más coordinaciones: es lento y propenso a errores.
- Ya tienen un identificador: iniciales de apellido paterno, materno y nombre, más la fecha de nacimiento (`AAAAMMDD`). Reconocen el riesgo de colisión entre personas con las mismas iniciales y fecha. Mejoras que discutieron: agregar iniciales del estado de origen, o usar la CURP.
- Lo que más piden donantes y aliados: número de personas impactadas, edad promedio y desglose por ciudad. Las preguntas cambian por aliado; quieren una plantilla base con preguntas adicionales.
- Lo que imaginan: subir el Excel, aplicar filtros de calidad, ver una vista previa y exportar, con una calificación de calidad en estrellas.
- Pendiente de su parte: compartir archivos Excel de ejemplo. Pendiente conjunto: definir los dos informes más importantes y su audiencia (ejemplo: Tamizaje Rosa para socios estratégicos).

**Decisiones que salen de ahí**

1. **Se respeta su ID.** El campo `idEira` (formato `^[A-ZÑ]{3}\d{8}$`, tres iniciales y `AAAAMMDD`) se importa tal cual. La fecha de nacimiento se obtiene del ID cuando no hay columna propia.
2. **Niveles de certeza, redefinidos:**
   - `verificada`: folio de tarjeta (`id:<folio>`) o CURP con formato válido (`curp:<HMAC>`).
   - `probable`: ID de EIRA válido (`eira:<HMAC del ID>`). Es probable y no verificada porque el ID puede chocar.
   - `sin_identificar`: sin folio, sin CURP y sin ID válido.
   Firma: `clavePersona(d: { folio?: string | null; curp?: string | null; idEira?: string | null }, hmacKey: string): { clave: string | null; certeza: Certeza }`, con esa prioridad. Sustituye a la firma por nombre y fecha de más abajo.
3. **Detección de colisiones de ID** (regla `colision_id`): mismo `idEira` con nombres completos normalizados cuya similitud Jaro-Winkler es menor a 0.85. Cada colisión genera un `ParDuplicado` con motivo "Mismo ID, nombres distintos" y la pregunta inversa: "¿Son dos personas distintas?". Si se confirma que son distintas, se separan en dos claves (`eira:<HMAC>#1`, `#2`) y queda en la bitácora. Es la pieza que demuestra con sus propios datos el riesgo que ya intuyen.
4. **Puente al folio.** Al grabar una tarjeta NFC se asocia el folio con el ID de EIRA de esa persona (`HSET imp:alias`), de modo que sus registros pasan de `probable` a `verificada` sin recapturar nada. El folio es opaco y no choca; la CURP no se graba en la tarjeta porque revela datos personales.
5. **`Asistencia`**: las filas con valor negativo ("No", "N", "0", vacío cuando la columna existe) no cuentan como atención ni participación; se cuentan aparte como `inasistencias` y se muestran en Calidad.
6. **`Edad`**: indicador nuevo `edad_promedio`, sobre personas únicas, usando la fecha del ID y la fecha de corte; si solo hay columna `Edad`, se usa esa y se advierte. Regla `edad_inconsistente` cuando la edad capturada difiere en más de un año de la calculada. En Valkey: `HSET imp:nac <personaClave> <AAAA-MM-DD>`.
7. **`Ciudad`** se mapea al campo `municipio` con el catálogo y sus alias (Ciudad Guzmán → Zapotlán el Grande). El desglose se rotula "Ciudad" en la interfaz, que es su palabra.
8. **Calificación en estrellas** (`CalidadArchivo`), visible en la vista previa antes de importar y por archivo en el Tablero. `puntaje = 0.4 × identificados + 0.3 × sinAnomalias + 0.3 × completos`; estrellas: menos de 50 = 1, menos de 65 = 2, menos de 80 = 3, menos de 92 = 4, 92 o más = 5. `motivos` dice qué subiría la calificación ("12 filas sin ID"). Sustituye a "Certeza del dato" como métrica principal; el desglose verificada / probable / sin identificar se conserva debajo.
9. **Flujo en cuatro pasos, con sus palabras:** Subir → Calidad → Vista previa → Exportar. La pantalla Importar muestra esos pasos como guía.
10. **Roles:** `coordinacion` sube y corrige el archivo de su programa; `presidencia` ve el consolidado, confirma colisiones y exporta. Usuarios simulados: `coord1/1111`, `coord2/1111`, `presi1/2222`. Sustituye al rol `direccion`.
11. **Plantillas de informe** (`PlantillaInforme`): una base con personas impactadas (cifra verificada y rango), edad promedio y desglose por ciudad, más indicadores adicionales que se activan por audiencia. Dos plantillas sembradas: "Tamizaje Rosa · socios estratégicos" (agrega atenciones por estudio y cobertura por ciudad) y "Informe general · donantes" (agrega participaciones y cruce entre programas). Ruta: `GET /api/plantillas` y `GET /api/informe?plantilla=<id>`.
12. **Archivos de prueba:** tres Excel con sus columnas (tabla en la Tarea 2).

**Sigue sin validar**

- Los encabezados exactos y el orden del ID (si las iniciales van antes o después de la fecha): se ajusta al recibir sus archivos.
- Cuáles son sus dos informes más importantes, aparte del ejemplo de Tamizaje Rosa.
- Si aceptan capturar la CURP y si llevan un Android a las jornadas (viabilidad del NFC).
- La transcripción de la conversación no estuvo disponible; esto sale del resumen de la nota.

## Global Constraints

- Envío en Devpost antes de las 16:00 CDMX del 2026-11-21. Corte de funciones a las 15:00. Primer recorrido completo del caso práctico a las 13:15.
- Solo datos ficticios en los archivos internos. Los datos públicos se usan con su fuente y fecha.
- Nunca presentar una deduplicación estimada como cifra oficial. Sin HyperLogLog ni conteos aproximados en ningún indicador.
- Unidades exactas y no sumables entre sí: `persona`, `atencion`, `estudio`, `participacion`, `entrega_insumo`. Toda suma entre unidades distintas se rechaza.
- Todo indicador lleva `valor`, `unidad`, `definicion`, `fechaCorte`, `fuentes`, `denominador` (o `null` con motivo) y `advertencias`.
- En Valkey no se guarda nombre, teléfono ni fecha de nacimiento: solo claves de persona derivadas con HMAC-SHA256 y la clave secreta `IMPACTO_HMAC_KEY`.
- El tablero suprime celdas de persona con valor menor a 5 y muestra `<5`.
- Dos registros se tratan como la misma persona sin intervención solo si comparten folio. Las coincidencias por nombre son propuestas que una persona confirma.
- Folio: `EIRA-XXXX-XXXX` (alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, último carácter verificador). La tarjeta NFC lleva solo el folio.
- Valkey se nombra "Valkey" en código, README y pitch; nunca "Redis".
- Valkey local: binario `https://download.valkey.io/releases/valkey-9.2.0-noble-x86_64.tar.gz`, verificado contra su `.sha256`. Solo tipos del núcleo (Sets, Hashes, Sorted Sets, Streams, Pub/Sub); sin módulos, porque el binario no los trae.
- Cliente: `import { Valkey } from 'iovalkey'`. La conexión suscrita a Pub/Sub es una conexión aparte.
- El Stream `imp:ajustes` nunca se recorta: sin `MAXLEN` ni `XDEL`.
- SheetJS se instala con `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (la versión de npm está abandonada) y se lee con `cellDates: true`. CSV: probar UTF-8 y, si aparece el carácter de reemplazo, releer como `ISO-8859-1`. Los CSV que exporta la herramienta llevan BOM para que Excel muestre bien los acentos.
- Interfaz en español, texto de 16 px o más. Repositorio público, licencia MIT, README con tabla "Implementado / Simulado / Para piloto".

## Review Focus

1. El mismo archivo se importa dos veces: los indicadores no cambian y la interfaz avisa que ya estaba cargado. Prueba en Tarea 3.
2. Archivo en Latin-1 con acentos y ñ, y fechas en `DD/MM/AAAA`, `AAAA-MM-DD` o número de serie de Excel: los municipios y fechas quedan bien. Prueba en Tarea 2.
3. La misma persona aparece en ambos programas con el nombre escrito distinto y sin folio: no se cuenta como una sola hasta que alguien confirma, y el rango lo refleja. Prueba en Tarea 3.
4. Fila sin fecha, sin municipio o con municipio fuera de catálogo: cuenta en su unidad, queda fuera de los desgloses afectados y aparece en calidad; no desaparece en silencio. Prueba en Tarea 2 y Tarea 3.
5. Alguien pide el total de "beneficiarias" sumando atenciones y participaciones: la respuesta es un error explicado, no un número. Prueba en Tarea 3 y Tarea 4.

---

## File Structure

| Ruta | Responsabilidad | Tarea |
|---|---|---|
| `shared/types.ts`, `shared/folio.ts` | Contrato y folios | 1 |
| `server/claves.ts` | Nombres de todas las claves de Valkey | 1 |
| `scripts/valkey-local.sh` | Descargar y arrancar Valkey sin Docker | 1 |
| `server/decisor.ts` | Interfaz `Decisor` y `DecisorReglas` (decisiones con probabilidad) | 2 |
| `server/normalizar.ts` | Texto, fechas, municipios, clave de persona | 2 |
| `server/importar.ts` | Leer CSV y Excel, proponer mapeo, reglas de calidad | 2 |
| `scripts/datos-sinteticos.ts` | Los dos archivos del caso práctico | 2 |
| `server/motor.ts` | Ingesta e indicadores sobre Valkey | 3 |
| `server/publicos.ts` | Denominadores de datos públicos | 3 |
| `server/app.ts`, `server/main.ts` | Rutas HTTP, eventos en vivo | 4 |
| `web/src/pantallas/*.tsx` | Importar, Calidad, Tablero, Informe, Registro | 5 |
| `web/src/lib/nfc.ts` | Leer y escribir folio por NFC | 5 |
| `Dockerfile`, `compose.yaml`, `Caddyfile`, `README.md`, `docs/devpost.md` | Despliegue y entrega | 6 |

Tras la Tarea 1 corren en paralelo las Tareas 2, 3 y 5. La Tarea 4 integra 2 y 3.

---

### Task 1: Andamiaje, contrato y Valkey local (en serie, 10 min)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore` (`.claude/`, `data/`, `node_modules/`, `dist/`, `.env`, `.valkey/`), `LICENSE`, `shared/types.ts`, `shared/folio.ts`, `server/claves.ts`, `scripts/valkey-local.sh`
- Test: `shared/folio.test.ts`

**Interfaces:**
- Produces (`shared/types.ts`):

```ts
export type Unidad = 'persona' | 'atencion' | 'estudio' | 'participacion' | 'entrega_insumo';
export type Certeza = 'verificada' | 'probable' | 'sin_identificar';
export type Campo = 'folio' | 'idEira' | 'curp' | 'nombres' | 'apellidos' | 'nombreCompleto' | 'fechaNacimiento' | 'edad'
  | 'municipio' | 'servicio' | 'fecha' | 'asistencia' | 'cantidad' | 'ignorar';
export type Mapeo = Record<string, Campo>;              // encabezado original → campo común
export interface Fuente {
  id: string; nombreArchivo: string; huella: string;     // sha256 del archivo
  programa: string; unidad: Exclude<Unidad, 'persona'>;
  fechaCorte: string; filas: number; mapeo: Mapeo; cargadaEn: string;
}
export interface Registro {
  id: string; fuenteId: string; fila: number;
  programa: string; unidad: Exclude<Unidad, 'persona'>;
  servicio: string | null; fecha: string | null;         // YYYY-MM-DD
  periodo: string | null;                                // YYYY-MM
  municipioClave: string | null;                         // clave INEGI de 5 dígitos
  personaClave: string | null; certeza: Certeza; cantidad: number;
}
export type ReglaCalidad = 'faltante' | 'fecha_invalida' | 'fecha_futura' | 'municipio_desconocido'
  | 'duplicado_probable' | 'folio_invalido' | 'id_invalido' | 'colision_id' | 'edad_inconsistente' | 'curp_invalida' | 'discrepancia_total';
export interface CalidadArchivo {                      // la "calificación en estrellas" que pidió EIRA
  estrellas: 1 | 2 | 3 | 4 | 5; puntaje: number;       // puntaje 0 a 100
  identificados: number; completos: number; sinAnomalias: number;   // porcentajes 0 a 100
  motivos: string[];                                   // qué le falta para subir una estrella
}
export interface PlantillaInforme { id: string; nombre: string; audiencia: string; indicadoresBase: string[]; indicadoresExtra: string[]; }
export interface Anomalia { id: string; fuenteId: string; fila: number; regla: ReglaCalidad; campo: string | null; detalle: string; }
export interface Filtro { programa?: string; periodoDesde?: string; periodoHasta?: string; municipioClave?: string; servicio?: string; }
export interface Indicador {
  clave: string; etiqueta: string; valor: number | '<5'; unidad: Unidad;
  definicion: string; fechaCorte: string; fuentes: string[];
  denominador: { valor: number; etiqueta: string; fuente: string; anio: number } | null;
  porcentaje: number | null; advertencias: string[];
  calculo: { comando: string; ms: number };            // comando de Valkey que produjo el valor
}
export interface PersonasUnicas {
  verificadas: number;          // por folio
  probables: number;            // por nombre + fecha de nacimiento, tras decisiones confirmadas
  registrosSinIdentificar: number;
  minimo: number; maximo: number;   // minimo = verificadas + probables; maximo = minimo + registrosSinIdentificar
  advertencias: string[];
}
export interface ParDuplicado { id: string; claveA: string; claveB: string; motivo: string; estado: 'pendiente' | 'misma' | 'distinta'; }
export interface Ajuste { id: string; en: string; por: string; tipo: 'importacion' | 'mapeo' | 'duplicado' | 'correccion' | 'asistencia_nfc'; detalle: string; }
```

- Produces (`server/claves.ts`), una función por clave:

| Función | Clave | Tipo | Contenido |
|---|---|---|---|
| `kFuente(id)` | `imp:fuente:<id>` | Hash | metadatos de `Fuente` |
| `kHuellas()` | `imp:huellas` | Set | huellas de archivos ya importados |
| `kRegistro(id)` | `imp:reg:<id>` | Hash | un `Registro` |
| `kPersonas(dim, valor)` | `imp:per:<dim>:<valor>` | Set | claves de persona; `dim` ∈ `programa`, `municipio`, `periodo`, `servicio`, `certeza`, `todas` |
| `kConteo(unidad)` | `imp:cnt:<unidad>` | Hash | campo `<programa>\|<municipio>\|<periodo>\|<servicio>` → suma de `cantidad` |
| `kSinIdentificar()` | `imp:sinid` | Hash | mismo campo → registros sin persona |
| `kAnomalias(fuenteId)` | `imp:anom:<fuenteId>` | List | `Anomalia` en JSON |
| `kDuplicados()` | `imp:dup` | Hash | id de par → `ParDuplicado` en JSON |
| `kAlias()` | `imp:alias` | Hash | clave de persona → clave canónica |
| `kAjustes()` | `imp:ajustes` | Stream | cada `Ajuste` |
| `kDenominador(indicador)` | `imp:den:<indicador>` | Hash | clave de municipio → valor |
| `kCobertura()` | `imp:rank:cobertura` | Sorted Set | municipio → porcentaje |
| `kEventos()` | `imp:eventos` | canal Pub/Sub | cambios para el tablero en vivo |

- Produces: `newFolio(): string`, `isValidFolio(f: string): boolean`; `scripts/valkey-local.sh` descarga el binario precompilado de Valkey 8 para Ubuntu noble x86_64 a `.valkey/` y lo arranca en el puerto 6379 con `--appendonly yes --dir .valkey/data`.

- [ ] **Step 1:** Inicializar proyecto y dependencias; scripts `dev`, `build`, `start`, `test`, `datos`, `valkey`.
- [ ] **Step 2:** Escribir `shared/types.ts` y `server/claves.ts` como arriba.
- [ ] **Step 3:** Prueba de folio (formato `^EIRA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$`, `isValidFolio` verdadero para uno nuevo y falso al cambiar el último carácter); implementar; `npx vitest run shared`, esperado PASS.
- [ ] **Step 4:** `npm run valkey` y verificar: `node -e "import('iovalkey').then(async({Valkey})=>{const v=new Valkey();console.log(await v.ping());v.disconnect()})"` imprime `PONG`.
- [ ] **Step 5:** Commit `chore: scaffold, contract and local Valkey` y push a `origin main`. El repositorio ya existe (`github.com/ForestKeeperIO/nerdearla-hack`, con `QUE-HAREMOS.md`, `.gitignore` y los planes); hacer `git pull --rebase` antes y conservar lo que ya está en `.gitignore`. Hay una colaboradora invitada: cada tarea paralela trabaja en su propia rama `t2-importar`, `t3-motor`, `t5-pantallas` y se integra a `main` al terminar.

### Task 2: Importación, mapeo y calidad (paralelo)

**Files:**
- Create: `server/normalizar.ts`, `server/importar.ts`, `server/catalogo-municipios.ts`, `scripts/datos-sinteticos.ts`
- Test: `server/normalizar.test.ts`, `server/importar.test.ts`

**Interfaces:**
- Consumes: tipos de `shared/types.ts`; `isValidFolio`
- Produces:
  - `normalizarTexto(s: string): string` — minúsculas, sin diacríticos, `ñ`→`n`, espacios colapsados
  - `parseFecha(v: unknown): string | null` — acepta `DD/MM/AAAA`, `D/M/AA`, `AAAA-MM-DD` y número de serie de Excel; devuelve `YYYY-MM-DD`
  - `claveMunicipio(nombre: string): string | null` — contra el catálogo de Jalisco (clave INEGI de 5 dígitos), con alias (`"Cd. Guzmán"`, `"Ciudad Guzmán"` → `14023` Zapotlán el Grande)
  - `clavePersona(d: { folio?: string | null; curp?: string | null; idEira?: string | null }, hmacKey: string): { clave: string | null; certeza: Certeza }`
  - `parseIdEira(id: string): { iniciales: string; fechaNacimiento: string } | null` — `^[A-ZÑ]{3}\d{8}$` con fecha válida; tolera minúsculas, espacios y guiones
  - `calificar(registros: Registro[], anomalias: Anomalia[], totalFilas: number): CalidadArchivo`
  - `leerArchivo(buf: Buffer, nombre: string): { encabezados: string[]; filas: Record<string, unknown>[] }` — CSV (detecta UTF-8 o Latin-1) y XLSX
  - `proponerMapeo(encabezados: string[]): Mapeo`
  - `proponerMapeoDetallado(encabezados: string[], d: Decisor): Promise<{ encabezado: string; campo: Campo; probabilidad: number; porConfirmar: boolean }[]>` — `porConfirmar` es `true` si la probabilidad es menor a 0.90
  - `interface Decisor { elegir(estado: string, pregunta: string, opciones: string[]): Promise<{ opcion: string; probabilidad: number }[]> }` y `class DecisorReglas implements Decisor` en `server/decisor.ts` (sinónimos exactos = 1.0; si no, la mejor similitud Jaro-Winkler contra los sinónimos; resultado ordenado de mayor a menor). Pruebas: `'Fecha de atención'` → `fecha` con probabilidad 1.0; `'Fcha atencion'` → `fecha` con probabilidad entre 0.80 y 0.99 y `porConfirmar: true`; `'Observaciones'` → `ignorar`.
  - `aRegistros(filas, mapeo: Mapeo, fuente: Fuente, hmacKey: string): { registros: Registro[]; anomalias: Anomalia[]; inasistencias: number; nombres: Map<string, string> }` (`nombres`: id de registro → nombre normalizado, solo en memoria, para detectar colisiones) — ``
  - `npm run datos` genera, con semilla fija, los tres Excel de la tabla en `sinteticos/` y `sinteticos/esperado.json`: la verdad con la que se construyeron los archivos (no calculada por el importador), con esta forma: `{ archivos: { [nombre]: { filas, asistencias, inasistencias, sinIdentificar, anomalias: Record<ReglaCalidad, number> } }, personas: { verificadas, probables, registrosSinIdentificar }, cruces: { tamizaje_florece, tamizaje_nutricion }, colisiones: 2, edadPromedio }`. Las pruebas comparan lo que produce el sistema contra ese archivo.

Archivos sintéticos (valores exactos que usan las pruebas):

| | `tamizaje-rosa.xlsx` | `salud-que-florece.xlsx` | `nutricion.xlsx` |
|---|---|---|---|
| Coordinación y unidad | Tamizaje Rosa, `atencion` | Salud que Florece, `participacion` | Tamizaje Rosa (nutrición), `atencion` |
| Filas (una por evento por persona) | 126: 120 asistencias y 6 inasistencias | 84: 80 y 4 | 42: 40 y 2 |
| Encabezados | `ID`, `Nombre`, `Estudio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha` | `Id usuario`, `NOMBRE COMPLETO`, `Taller`, `EDAD`, `Ciudad`, `Asistió`, `fecha_evento` | `ID`, `Nombre`, `Tipo de servicio`, `Edad`, `Ciudad`, `Asistencia`, `Fecha`, `CURP` |
| Fechas | `DD/MM/AAAA` como texto | número de serie de Excel | fecha de Excel |
| Personas distintas | 90 (30 con dos atenciones) | 70 (10 con dos participaciones) | 30 (10 con dos atenciones) |
| Con ID de EIRA válido | 82 personas | 58 personas | 30 personas |
| Con CURP | 0 | 0 | 20 personas |
| Sin ID ni CURP | 8 filas | 12 filas | 0 |
| Presentes en más de un archivo | 15 personas entre los dos primeros con el mismo ID; 10 del tercero están también en el primero | | |
| Colisiones de ID sembradas | 2 pares: mismo ID de EIRA y nombres completos distintos (uno dentro del primer archivo, otro entre el primero y el segundo) | | |
| Otras anomalías sembradas | 3 fechas inválidas, 2 ciudades desconocidas, 4 filas duplicadas exactas, 3 ID con formato inválido | 2 fechas futuras, 1 ciudad desconocida, 5 edades que no coinciden con la fecha del ID | 1 CURP con formato inválido |

El caso de la guía (120 atenciones y 80 participaciones) son los dos primeros archivos; el tercero existe porque EIRA consolida tres o más coordinaciones. Los encabezados se cambian por los reales en cuanto EIRA comparta sus archivos de ejemplo.

- [ ] **Step 1:** Pruebas que fallan:

```ts
test('fechas en los tres formatos', () => {
  expect(parseFecha('12/03/1984')).toBe('1984-03-12');
  expect(parseFecha('1984-03-12')).toBe('1984-03-12');
  expect(parseFecha(30753)).toBe('1984-03-12');
  expect(parseFecha('31/02/2026')).toBeNull();
});
test('municipio con acento, alias y desconocido', () => {
  expect(claveMunicipio('Zapotlán el Grande')).toBe('14023');
  expect(claveMunicipio('CD. GUZMAN')).toBe('14023');
  expect(claveMunicipio('Villa Inexistente')).toBeNull();
});
test('clave de persona por niveles y prioridad', () => {
  const k = 'k'.repeat(32);
  expect(clavePersona({ folio: FOLIO_OK, curp: CURP_OK, idEira: 'ELM19840312' }, k)).toEqual({ clave: `id:${FOLIO_OK}`, certeza: 'verificada' });
  const c = clavePersona({ curp: CURP_OK, idEira: 'ELM19840312' }, k);
  expect(c.certeza).toBe('verificada'); expect(c.clave).toMatch(/^curp:[0-9a-f]{64}$/);
  const a = clavePersona({ idEira: 'ELM19840312' }, k), b = clavePersona({ idEira: ' elm-19840312 ' }, k);
  expect(a.certeza).toBe('probable'); expect(a.clave).toBe(b.clave); expect(a.clave).toMatch(/^eira:[0-9a-f]{64}$/);
  expect(clavePersona({ idEira: 'ELM19841340' }, k)).toEqual({ clave: null, certeza: 'sin_identificar' });   // fecha imposible
  expect(clavePersona({ folio: 'EIRA-XXXX-XXXX', idEira: 'ELM19840312' }, k).certeza).toBe('probable');     // folio inválido se ignora
});
test('parseIdEira saca iniciales y fecha', () => {
  expect(parseIdEira('ELM19840312')).toEqual({ iniciales: 'ELM', fechaNacimiento: '1984-03-12' });
  expect(parseIdEira('EL19840312')).toBeNull();
});
test('la clave no contiene el ID ni la CURP y cambia con otra llave', ...);
test('propone el mapeo de los tres archivos sintéticos', () => {
  expect(proponerMapeo(['ID','Nombre','Estudio','Edad','Ciudad','Asistencia','Fecha']))
    .toEqual({ ID:'idEira', Nombre:'nombreCompleto', Estudio:'servicio', Edad:'edad', Ciudad:'municipio', Asistencia:'asistencia', Fecha:'fecha' });
  expect(proponerMapeo(['Id usuario','NOMBRE COMPLETO','Taller','EDAD','Ciudad','Asistió','fecha_evento']))
    .toEqual({ 'Id usuario':'idEira', 'NOMBRE COMPLETO':'nombreCompleto', Taller:'servicio', EDAD:'edad', Ciudad:'municipio', 'Asistió':'asistencia', fecha_evento:'fecha' });
  expect(proponerMapeo(['ID','Nombre','Tipo de servicio','Edad','Ciudad','Asistencia','Fecha','CURP']).CURP).toBe('curp');
});
test('cada archivo sintético coincide con esperado.json', () => {
  for (const [nombre, e] of Object.entries(esperado.archivos)) {
    const { registros, anomalias, inasistencias } = importarSintetico(nombre);
    expect(registros).toHaveLength(e.asistencias);
    expect(inasistencias).toBe(e.inasistencias);
    expect(registros.filter(r => r.certeza === 'sin_identificar')).toHaveLength(e.sinIdentificar);
    for (const [regla, n] of Object.entries(e.anomalias)) expect(cuenta(anomalias, regla)).toBe(n);
  }
});
test('valores fijos del caso de la guía', () => {
  expect(esperado.archivos['tamizaje-rosa.xlsx'].asistencias).toBe(120);
  expect(esperado.archivos['salud-que-florece.xlsx'].asistencias).toBe(80);
  expect(esperado.colisiones).toBe(2);
});
test('mismo ID con nombres distintos genera colision_id; con nombres parecidos no', ...);
test('edad capturada que difiere más de un año de la del ID genera edad_inconsistente', ...);
test('calificar: archivo perfecto da 5 estrellas; con 30 % sin ID baja y el motivo lo dice', () => {
  expect(calificar(perfectos, [], 100).estrellas).toBe(5);
  const c = calificar(con30SinId, [], 100);
  expect(c.estrellas).toBeLessThan(5);
  expect(c.motivos).toContainEqual(expect.stringMatching(/30 filas sin ID/));
});
test('una fila con fecha inválida conserva su registro con fecha y periodo nulos', ...);
```

- [ ] **Step 2:** Correr, esperado FAIL.
- [ ] **Step 3:** Implementar `scripts/datos-sinteticos.ts` y `npm run datos`; revisar a mano que los conteos de la tabla se cumplan.
- [ ] **Step 4:** Implementar `normalizar.ts` e `importar.ts`. `proponerMapeo` usa un diccionario de sinónimos por campo sobre el encabezado normalizado; `duplicado_probable` = misma persona, misma fecha y mismo servicio dentro del archivo; un folio presente pero inválido genera `folio_invalido` y se ignora para la clave.
- [ ] **Step 5:** Correr, esperado PASS. Commit `feat: import, column mapping and quality rules`.

### Task 3: Motor de indicadores sobre Valkey (paralelo)

**Files:**
- Create: `server/motor.ts`, `server/publicos.ts`, `publicos/README.md`
- Test: `server/motor.test.ts` (usa Valkey real en la base 15 y hace `FLUSHDB` antes de cada prueba)

**Interfaces:**
- Consumes: tipos; `server/claves.ts`
- Produces:
  - `ingerir(v: Valkey, fuente: Fuente, registros: Registro[], anomalias: Anomalia[], por: string): Promise<{ nuevo: boolean }>`
  - `conteo(v, unidad: Exclude<Unidad,'persona'>, f: Filtro): Promise<number>`
  - `personasUnicas(v, f: Filtro): Promise<PersonasUnicas>`
  - `cruce(v, programaA: string, programaB: string): Promise<{ enAmbos: number; soloA: number; soloB: number; advertencias: string[] }>`
  - `sumar(a: Indicador, b: Indicador): Indicador` — lanza `ErrorUnidades` si `a.unidad !== b.unidad`
  - `paresPendientes(v): Promise<ParDuplicado[]>`; `decidirPar(v, id: string, decision: 'misma' | 'distinta', por: string): Promise<void>`
  - `ligarFolio(v, d: { folio: string; idEira: string; por: string }): Promise<void>` — `HSET imp:alias`, mueve la clave en los conjuntos dentro de `MULTI`, `XADD imp:ajustes`, `PUBLISH imp:eventos`
  - `edadPromedio(v, f: Filtro): Promise<Indicador>` — sobre los miembros del conjunto filtrado, con `HMGET imp:nac`
  - `registrarAsistencia(v, d: { folio: string; programa: string; servicio: string; municipioClave: string; por: string }): Promise<Registro>`
  - `indicadores(v, f: Filtro): Promise<Indicador[]>`
  - `ajustes(v, desde?: string): Promise<Ajuste[]>`
  - `cargarDenominadores(v, indicador: string, filas: { municipioClave: string; valor: number }[], meta: { fuente: string; anio: number; etiqueta: string }): Promise<void>`
  - `cobertura(v, f: Filtro): Promise<{ municipioClave: string; personas: number | '<5'; denominador: number; porcentaje: number | null }[]>`

Comandos por operación:

| Operación | Comandos |
|---|---|
| Ingesta de un archivo | `SADD imp:huellas` (si devuelve 0, el archivo ya estaba: no se ingiere); una `pipeline` con `HSET` del registro, `SADD` a cada conjunto de personas, `HINCRBYFLOAT` del conteo, `RPUSH` de anomalías; `XADD imp:ajustes` al final |
| Conteo por filtro | `HGETALL imp:cnt:<unidad>` y suma de los campos que cumplen el filtro |
| Personas únicas con filtro | `SINTERCARD` entre los conjuntos de las dimensiones filtradas; por certeza, intersección adicional con `imp:per:certeza:<nivel>` |
| Cruce entre programas | `SINTERCARD 2 imp:per:programa:A imp:per:programa:B` y `SCARD` de cada uno |
| Confirmar duplicado | `HSET imp:alias`, mover la clave con `SREM`/`SADD` en los conjuntos afectados dentro de `MULTI`, `HSET imp:dup`, `XADD imp:ajustes` |
| Asistencia por NFC | igual que la ingesta de un registro, más `PUBLISH imp:eventos` |
| Cobertura | `ZADD imp:rank:cobertura`, `ZREVRANGE ... WITHSCORES` |

Pares que se generan al ingerir: cada `colision_id` (mismo ID de EIRA, nombres completos con similitud Jaro-Winkler menor a 0.85). `ingerir` recibe en memoria el mapa `nombres` de la Tarea 2, lo usa para comparar y lo descarta: en Valkey no queda ningún nombre.

- [ ] **Step 1:** Pruebas que fallan (con los dos archivos sintéticos ya convertidos por la Tarea 2; si aún no existe, construir registros equivalentes a mano en el archivo de prueba):

```ts
test('conteos por unidad', async () => {
  expect(await conteo(v, 'atencion', {})).toBe(160);          // 120 de tamizaje + 40 de nutrición
  expect(await conteo(v, 'atencion', { servicio: undefined, programa: 'Tamizaje Rosa' })).toBe(160);
  expect(await conteo(v, 'participacion', {})).toBe(80);
});
test('importar dos veces el mismo archivo no cambia nada', async () => {
  expect((await ingerir(v, fuenteA, regsA, anomA, 'coord1')).nuevo).toBe(false);
  expect(await conteo(v, 'atencion', {})).toBe(160);
});
test('personas únicas coinciden con esperado.json y el rango es coherente', async () => {
  const p = await personasUnicas(v, {});
  expect(p.verificadas).toBe(esperado.personas.verificadas);
  expect(p.probables).toBe(esperado.personas.probables);
  expect(p.registrosSinIdentificar).toBe(esperado.personas.registrosSinIdentificar);
  expect(p.minimo).toBe(p.verificadas + p.probables);
  expect(p.maximo).toBe(p.minimo + p.registrosSinIdentificar);
});
test('cruce entre programas por ID compartido', async () => {
  expect((await cruce(v, 'Tamizaje Rosa', 'Salud que Florece')).enAmbos).toBe(esperado.cruces.tamizaje_florece);
});
test('una colisión confirmada como dos personas las separa y queda en la bitácora', async () => {
  const pares = await paresPendientes(v);
  expect(pares).toHaveLength(2);
  const antes = (await personasUnicas(v, {})).probables;
  await decidirPar(v, pares[0].id, 'distinta', 'presi1');
  expect((await personasUnicas(v, {})).probables).toBe(antes + 1);
  expect((await ajustes(v)).at(-1)).toMatchObject({ tipo: 'duplicado', por: 'presi1' });
});
test('ligar un folio a un ID pasa a esa persona de probable a verificada sin cambiar el total', async () => {
  const antes = await personasUnicas(v, {});
  await ligarFolio(v, { folio: FOLIO_OK, idEira: ID_CONOCIDO, por: 'coord1' });
  const despues = await personasUnicas(v, {});
  expect(despues.verificadas).toBe(antes.verificadas + 1);
  expect(despues.probables).toBe(antes.probables - 1);
  expect(despues.minimo).toBe(antes.minimo);
});
test('edad promedio sobre personas únicas, con fecha de corte', async () => {
  expect((await edadPromedio(v, {})).valor).toBeCloseTo(esperado.edadPromedio, 1);
});
test('decidir "misma" en una colisión no cambia cifras y no se vuelve a proponer', ...);
test('sumar unidades distintas lanza error explicado', () => {
  expect(() => sumar(indAtenciones, indParticipaciones)).toThrow(/no se pueden sumar: atencion y participacion/);
});
test('registro sin municipio cuenta en el total y no en el desglose', ...);
test('filtro por municipio y periodo combina dimensiones', ...);
test('asistencia por NFC entra como verificada, publica evento y queda en ajustes', ...);
test('personas menores a 5 en un municipio se devuelven como "<5"', ...);
test('cobertura = personas / denominador, con fuente y año', ...);
test('ningún valor guardado contiene un nombre sembrado', async () => {
  for (const k of await v.keys('imp:*')) expect(JSON.stringify(await volcar(v, k))).not.toMatch(/ejemplo/i);
});
```

- [ ] **Step 2:** Correr, esperado FAIL.
- [ ] **Step 3:** Implementar `motor.ts` con la tabla de comandos.
- [ ] **Step 4:** Implementar `publicos.ts` con datos públicos reales, ya descargados y verificados (copiarlos del directorio de trabajo a `publicos/` y versionarlos, con `publicos/README.md` que da URL, fecha de descarga y cómo se derivó cada uno):
  - `jalisco_mun_denominadores_2020.csv` — derivado del Censo 2020 ITER de INEGI (`https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_14_cpv2020_csv.zip`, filas con `LOC == '0000'`): mujeres de 25 a 64 años, de 40 a 69, población indígena y porcentaje rural por municipio. Denominador del indicador `mujeres_25_64`. Valor de control para la prueba: Zapotlán el Grande (`14023`) = 30,089 mujeres de 25 a 64.
  - `IMM_2020.xlsx` de CONAPO (`https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Municipio/IMM_2020.xlsx`, hoja `IMM_2020`, columnas `CVE_MUN` y `GM_2020`): grado de marginación. Indicador adicional: porcentaje de atenciones en municipios de marginación alta o muy alta.
  - Catálogo de los 125 municipios de Jalisco (`https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14`, JSON): alimenta `server/catalogo-municipios.ts` de la Tarea 2.
  - `jalisco_def_c50_c53_2024.csv` — derivado de defunciones registradas 2024 de INEGI: solo como contexto estatal en el informe (646 muertes por cáncer de mama y 254 por cervicouterino en Jalisco); no se muestra por municipio porque las cifras de un solo año son muy pequeñas.

  La clave de unión es la clave INEGI de 5 dígitos como texto. La cobertura lleva siempre la advertencia "Atenciones de datos ficticios sobre población real del Censo 2020" mientras los archivos internos sean sintéticos.
- [ ] **Step 5:** Correr, esperado PASS. Commit `feat: Valkey indicator engine with exact set operations`.

### Task 4: Rutas HTTP y tablero en vivo (tras Tareas 2 y 3)

**Files:**
- Create: `server/app.ts`, `server/main.ts`
- Test: `server/app.test.ts`

**Interfaces (JSON; `Authorization: Bearer <token>`; usuarios simulados `coord1/1111` y `coord2/1111` rol `coordinacion`, `presi1/2222` rol `presidencia`; donde las tablas dicen `direccion` o "ambos", léase `presidencia`):**

| Método y ruta | Rol | Respuesta |
|---|---|---|
| `POST /api/login` | público | `{ token, role }` |
| `POST /api/fuentes/previa` (multipart `archivo`) | coordinacion | `{ calidad: CalidadArchivo, encabezados, muestra: 5 filas, mapeoPropuesto: { encabezado, campo, probabilidad, porConfirmar }[], yaImportado: boolean }` |
| `POST /api/fuentes` (multipart `archivo`, `programa`, `unidad`, `fechaCorte`, `mapeo`) | coordinacion | `{ fuente, registros: number, anomalias: number, nuevo: boolean }` |
| `GET /api/fuentes` | ambos | `Fuente[]` |
| `GET /api/calidad?fuenteId=` | ambos | `{ porRegla: Record<ReglaCalidad, number>; anomalias: Anomalia[] }` |
| `GET /api/duplicados` / `POST /api/duplicados/:id` `{ decision }` | coordinacion | `ParDuplicado[]` / 204 |
| `GET /api/indicadores?<Filtro>` | ambos | `{ indicadores: Indicador[]; personas: PersonasUnicas; cruces; cobertura }` |
| `POST /api/sumar` `{ a, b }` | ambos | `Indicador` o 422 `{ error }` |
| `POST /api/asistencia` `{ folio, programa, servicio, municipioClave }` | coordinacion | `Registro`; 400 si el folio es inválido |
| `GET /api/eventos` (SSE) | ambos | evento `cambio` por cada `PUBLISH` |
| `GET /api/ajustes` | ambos | `Ajuste[]` |
| `GET /api/informe?<Filtro>&formato=json\|csv` | ambos | informe con indicadores, definiciones, fuentes, advertencias y ajustes |
| `GET /api/health` | público | `{ ok: true, valkey: boolean, claves: number }` |

- [ ] **Step 1:** Pruebas que fallan: sin token 401; `presidencia` no puede importar (403) y `coordinacion` no puede decidir colisiones ni exportar el consolidado (403); la vista previa devuelve `calidad: CalidadArchivo` antes de importar; `/api/sumar` con atenciones y participaciones responde 422 con el texto del error; el CSV del informe no contiene nombres y trae columnas `indicador,valor,unidad,definicion,fecha_corte,fuentes,denominador,advertencias`; `/api/asistencia` con folio inválido 400; importar el mismo archivo dos veces devuelve `nuevo: false`.
- [ ] **Step 2:** Correr, esperado FAIL. Implementar. `main.ts` sirve `dist/`, puerto `PORT` o 8787, y se suscribe a `imp:eventos` con una conexión aparte para el SSE.
- [ ] **Step 3:** Correr todo `npx vitest run`, esperado PASS. Commit `feat: HTTP API, live events and report export`.

### Task 5: Pantallas (paralelo, contra el contrato de la Tarea 4)

**Files:**
- Create: `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/api.ts`, `web/src/styles.css`, `web/src/pantallas/Importar.tsx`, `web/src/pantallas/Calidad.tsx`, `web/src/pantallas/Tablero.tsx`, `web/src/pantallas/Informe.tsx`, `web/src/pantallas/Registro.tsx`, `web/src/componentes/TarjetaIndicador.tsx`, `web/src/componentes/RangoPersonas.tsx`, `web/src/lib/nfc.ts`
- Test: `web/src/componentes/TarjetaIndicador.test.tsx`, `web/src/componentes/RangoPersonas.test.tsx`

**Interfaces:**
- Produces: `leerFolioNfc(): Promise<string | null>`, `escribirFolioNfc(folio: string): Promise<boolean>`, `nfcDisponible(): boolean`

- [ ] **Step 1:** Pruebas que fallan:

```tsx
test('la tarjeta siempre muestra unidad, fecha de corte y fuente', () => {
  render(<TarjetaIndicador indicador={atenciones} />);
  expect(screen.getByText('atenciones')).toBeVisible();
  expect(screen.getByText(/corte: 30 sep 2026/i)).toBeVisible();
  expect(screen.getByText(/tamizaje-rosa\.csv/)).toBeVisible();
});
test('sin denominador explica por qué en vez de mostrar porcentaje', ...);
test('el rango de personas nunca se muestra como un solo número', () => {
  render(<RangoPersonas p={{ verificadas:60, probables:75, registrosSinIdentificar:20, minimo:135, maximo:155, advertencias:[] }} />);
  expect(screen.getByText('60')).toBeVisible();             // verificadas
  expect(screen.getByText(/entre 135 y 155/)).toBeVisible();
  expect(screen.queryByText(/^155$/)).toBeNull();
});
```

- [ ] **Step 2:** Implementar. Decisiones fijas:
  - **Importar**: soltar archivo → tabla "columna del archivo → campo común" con la propuesta ya elegida y 5 filas de muestra → elegir programa, unidad y fecha de corte → Importar.
  - **Calidad**: conteo por regla y lista de filas con problema (número de fila y motivo); sección "¿Es la misma persona?" con los pares pendientes y botones "Sí, es la misma" y "No, son distintas".
  - **Tablero**: filtros arriba (programa, periodo, municipio, servicio). Una tarjeta por unidad, separadas y sin total general. Bloque "Personas" con `RangoPersonas`. Bloque "Entre programas" con el cruce. Tabla de cobertura por municipio con su denominador y fuente. Contador en vivo "Asistencias verificadas hoy" que sube con el SSE.
  - **Certeza del dato** (la métrica única, arriba del Tablero): porcentaje de registros con persona verificada por folio, con el desglose verificada / probable / sin identificar en una barra, y la acción sugerida debajo ("20 registros sin identificar: revisar en Calidad"; "5 posibles duplicados por confirmar"). `GET /api/indicadores` la devuelve como `certeza: { verificada: number; probable: number; sinIdentificar: number; porcentajeVerificado: number }`, calculada sobre registros, no sobre personas.
  - **Cómo se calculó** (desplegable en cada tarjeta): el comando de Valkey que produjo la cifra y cuánto tardó, por ejemplo `SINTERCARD 2 imp:per:programa:Tamizaje Rosa imp:per:programa:Salud que Florece · 0.4 ms`. Cada `Indicador` lleva `calculo: { comando: string; ms: number }`, que `motor.ts` llena midiendo la llamada.
  - **Informe**: vista imprimible con las mismas cifras, una nota al pie por indicador (definición, fuente, fecha de corte), la lista de advertencias y la bitácora de ajustes; botones "Descargar CSV" e "Imprimir o guardar PDF".
  - **Registro** (pensada para celular): botón "Acercar tarjeta" si `nfcDisponible()`, o campo para teclear el folio; elegir programa y servicio; confirma con el folio en grande. Botón "Grabar tarjeta nueva" que genera un folio y lo escribe.
- [ ] **Step 3:** Correr `npx vitest run web`, esperado PASS. Commit `feat: import, quality, dashboard, report and tap screens`.

### Task 6: Despliegue y entrega

**Files:**
- Create: `Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example`, `README.md`, `docs/devpost.md`

- [ ] **Step 1:** `compose.yaml` con `app`, `valkey` (`valkey/valkey:8`, `--appendonly yes`, volumen) y `caddy` con HTTPS (Web NFC lo exige). En este VPS no hay Docker: aquí corre con `npm run valkey` y `npm start` detrás de un túnel o proxy con HTTPS; Ian levanta la `compose.yaml` en AWS.
- [ ] **Step 2:** `README.md`: Qué resuelve; Cómo levantarlo; Recorrido del caso (120 y 80); Qué se puede sumar y qué no; Cómo se cuentan las personas únicas y por qué es un rango; Qué hace Valkey, con la tabla de claves, y qué pasa si se pierde (se reconstruye reimportando los archivos); Tabla Implementado / Simulado / Para piloto; Privacidad; Operación y costos; Supuestos validados con EIRA; Preguntas abiertas; Fuentes de datos públicos; Licencia.
- [ ] **Step 3:** `docs/devpost.md` con un párrafo y una evidencia por criterio.
- [ ] **Step 4:** Recorrido final: importar ambos archivos → revisar mapeo → ver 120 y 80 separados → abrir Calidad y ver las anomalías sembradas → confirmar un duplicado y ver cambiar el cruce de 10 a 11 → intentar sumar unidades y ver el error → tocar una tarjeta NFC en el celular y ver subir "verificadas" en la laptop → filtrar por municipio → exportar el informe.
- [ ] **Step 5:** 15:00 corte; video de respaldo de 90 s; 15:20 envío a Devpost; 15:40 tres ensayos.

---

# Parte B. Estrategia

## La idea en una frase

Cada cifra de EIRA con su acta de nacimiento: qué cuenta, de qué archivo salió, con qué certeza y contra cuántas mujeres del municipio.

## Tres piezas con nombre

1. **"Esto no se suma".** El sistema se niega a sumar atenciones con participaciones y explica por qué.
2. **Colisiones a la vista y estrellas.** El sistema detecta cuando el ID de EIRA apunta a dos personas distintas, y califica cada archivo con estrellas diciendo qué le falta.
3. **Toque que verifica.** La tarjeta NFC liga un folio opaco al ID que ya tienen, sin recapturar nada: los registros de esa persona pasan de probable a verificada y el tablero lo muestra en vivo.

## Preguntas para EIRA (Reto 3) y lo que fijan

| # | Pregunta | Qué fija | Supuesto mientras tanto |
|---|---|---|---|
| 1 | "En su sitio hablan de más de 40,000 mujeres y 86,000 estudios, y la guía de más de 51,000 personas beneficiadas. ¿Qué cuenta cada cifra y de qué archivos sale?" | Definiciones de cada `Unidad` y el texto de `definicion` de cada indicador | Las cinco unidades del plan, sin sumar entre ellas |
| 2 | "Sus archivos, ¿traen una fila por persona o totales por evento, por ejemplo 'asistentes: 45'? ¿Qué programas tienen nombre y fecha de nacimiento y cuáles no?" | Si las participaciones e insumos entran como filas agregadas (`cantidad` > 1, sin persona) y cuánto pesa el nivel "sin identificar" | Tamizaje por persona; educación e insumos pueden venir agregados |
| 3 | "¿Las pacientes de Tamizaje Rosa tienen hoy algún número o folio propio? ¿Qué equipo llevan a la jornada: laptop, celular, y es Android?" | Si el folio es nuevo o ya existe uno que respetar; si el registro por NFC se demuestra con celular | No hay folio; se crea `EIRA-XXXX-XXXX`; hay al menos un Android |
| 4 | "¿Qué les pidió exactamente el último aliado en su informe y con qué desgloses? ¿Nos comparten hoy la estructura de un informe y las tablas sintéticas que ofrece la guía?" | Secciones del Informe y encabezados de los archivos sintéticos | Mujeres, estudios por tipo, comunidades, estados e insumos; encabezados inventados |
| 5 | "¿Cuánto tardaron en armar el último informe anual, quién lo hizo, y qué tendría que hacer esto para que lo usaran en el siguiente?" | El "antes" del pitch, la sección de operación del README | Días de trabajo manual de una persona de coordinación |

Orden si hay poco tiempo: 4, 2, 1, 3, 5. La 4 es la única que entrega material (la guía y Devpost dicen que las tablas sintéticas y la estructura de informe se dan a petición).

Cuidado al hablar de sus cifras: la investigación encontró que las cifras públicas de EIRA cambian de unidad entre fuentes. En el pitch se usa solo la advertencia que la propia guía hace sobre las 51,000 personas; no se señalan errores de sus documentos.

Territorio para los datos de prueba: EIRA trabaja en Jalisco, Colima, Michoacán, Morelos, San Luis Potosí, Guanajuato, Veracruz y Tlaxcala; el prototipo trae denominadores solo de Jalisco y lo declara.

## Qué mostrar a cada juez

| Juez | Momento |
|---|---|
| Roberto Luna Rojas (Valkey) | "Las personas únicas son intersecciones exactas de conjuntos en Valkey; no usamos HyperLogLog porque EIRA prohíbe presentar estimaciones como cifra oficial" |
| Martí Cristobal | La regla de unidades y los tres niveles de certeza como decisiones de diseño probadas |
| Valeria Rivera Contreras | En Valkey no hay nombres, solo claves derivadas; todo se reconstruye desde los archivos |
| Ximena Cruz, EIRA | Del archivo al informe en minutos, con el dato que EIRA dé sobre cuánto tardan hoy |
| Gael Hernández | Un PR de Devin enlazado en el README |

## Pitch de 2 minutos

- 0:00–0:15 "Hoy Presidencia junta a mano los Excel de cada coordinación, y el ID que usan, iniciales más fecha de nacimiento, puede chocar entre dos personas. Esto lo consolida, lo califica y lo deja listo para el donante."
- 0:15–0:45 Subir tres Excel; el mapeo se propone solo; cada archivo recibe su calificación en estrellas y dice qué le falta.
- 0:45–1:10 Calidad: el sistema encuentra dos personas distintas con el mismo ID; al separarlas cambia la cifra y queda en la bitácora.
- 1:10–1:30 Vista previa del informe para socios estratégicos: personas impactadas, edad promedio, desglose por ciudad. Atenciones y participaciones no se suman.
- 1:30–1:45 Toque de la tarjeta NFC: el folio se liga al ID de la paciente y sus registros pasan de probable a verificada, en vivo.
- 1:45–2:00 Exportar; cobertura contra población de INEGI; qué es real y qué simulado.

## Costos y sostenibilidad (para el README)

- Sin modelos de lenguaje generativos: el mapeo de columnas, las reglas de calidad y las coincidencias son reglas deterministas y conjuntos en Valkey. Costo por uso: cero.
- Punto de extensión para un modelo de decisión al estilo Jev (TypeSafe AI): `server/decisor.ts` define `interface Decisor { elegir(estado: string, pregunta: string, opciones: string[]): Promise<{ opcion: string; probabilidad: number }[]> }`. La implementación del prototipo es `DecisorReglas` (sinónimos y similitud de texto, con la similitud como probabilidad). Se usa en dos lugares: `proponerMapeo` (¿a qué campo común corresponde este encabezado?) y la propuesta de pares duplicados. Toda decisión con probabilidad menor a 0.90 se muestra como "por confirmar" y la confirma una persona.
- Un `DecisorModelo` queda descrito, no construido, salvo que sobre tiempo después de las 13:15: Jev es cerrado, su registro está en pausa y se sirve desde Estados Unidos, así que no se le envían filas de pacientes; la alternativa viable es un modelo abierto local (Laya multilingüe, 322M, Apache-2.0, cerca de 1 GB de memoria). Su desempeño en español no está verificado en ninguna fuente.
- Demo y piloto: una instancia pequeña con la aplicación y Valkey en el mismo equipo. Lightsail de 512 MB cuesta 5 USD al mes (precio leído en la página oficial); los precios de EC2 son de terceros y se presentan como estimación de 5 a 12 USD al mes.
- Costo cero: laptop de oficina con el mismo `compose.yaml` y respaldo de los archivos originales. Se declara lo que implica: sin disponibilidad garantizada, un solo punto de falla y alguien que cuide el equipo.
- Valkey administrado (ElastiCache Serverless): mínimo cercano a 6 USD al mes; opción para cuando haya presupuesto.
- Licencia: Valkey es BSD-3-Clause bajo la Linux Foundation; ningún proveedor puede cambiarle las condiciones a EIRA.
- Créditos para organizaciones sin fines de lucro (AWS vía TechSoup): se mencionan como "por verificar"; no se confirmó la elegibilidad en México.

## Fuera de alcance y por qué

- Conexión directa a Google Forms o Sheets: requiere credenciales de EIRA; se importa el archivo exportado.
- Deduplicación automática por nombre: la guía la prohíbe como cifra oficial.
- Datos clínicos: el modelo no guarda resultados ni hallazgos.
- Edición de registros individuales: solo decisiones de duplicado y asistencias nuevas.

## Sin verificar

- Encabezados y plataformas reales de EIRA: los archivos sintéticos son un supuesto hasta que EIRA comparta los suyos.
- Tabla pública de mujeres por municipio lista para descargar.
- Disponibilidad del binario precompilado de Valkey para este servidor; si falla, se compila desde fuente o se usa una instancia que levante Ian.
- Tipo de los dos dispositivos NFC y si hay un Android con Chrome.
