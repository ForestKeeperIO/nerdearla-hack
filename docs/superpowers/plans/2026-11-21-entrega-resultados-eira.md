# Entrega Segura de Resultados EIRA (Reto 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una aplicación web que sustituye a WhatsApp para entregar resultados de Papanicolaou: carga del PDF, asociación verificada con la paciente, revisión y autorización clínica, aviso sin datos clínicos, consulta autenticada y seguimiento de los casos que requieren contacto, demostrando de punta a punta el caso "Ana Ejemplo".

**Architecture:** Un solo servicio Node (Hono) con SQLite como sistema de registro y los PDF cifrados en disco. Cada resultado avanza por una máquina de estados que solo permite la transición correcta al rol correcto, y cada acción queda en una bitácora encadenada por hash. Valkey sostiene todo lo que debe caducar o hacerse una sola vez: códigos de acceso de la paciente, límite de intentos, tokens de descarga de un solo uso, sesiones revocables y la cola de avisos.

**Tech Stack:** Node 22, TypeScript, Hono + @hono/node-server, better-sqlite3, iovalkey, React 18 + Vite, pdf-lib (PDF sintéticos), pdfjs-dist + jsQR (leer el folio del escaneo), qrcode, Vitest, Docker Compose (app + `valkey/valkey:8` + Caddy).

**Spec:** Guía de EIRA, sección "RETO 4" y secciones 5 y 6: https://drive.google.com/file/d/1W-t7xGprXyj7PjzC7iCw32aiDgoZGXXl/view. Reglas: https://vibeathon-mexico-2026.devpost.com/rules. Estrategia y preguntas a EIRA: Parte B. Este plan reemplaza a `2026-11-21-expediente-unico-eira.md`.

## Global Constraints

- Envío en Devpost antes de las 16:00 CDMX del 2026-11-21. Código: hasta 13:30 y de 14:30 a 15:30. Corte de funciones a las 15:00.
- Solo datos y PDF ficticios. Pacientes de prueba: "Ana Ejemplo" y "Rosa Prueba".
- Ningún aviso contiene diagnóstico, hallazgo ni tipo de estudio. Texto único del aviso: `EIRA: tienes un documento disponible. Consúltalo en {url} con tu folio. Este mensaje no contiene resultados.`
- Ningún PDF se sirve por enlace público o permanente. Toda descarga exige sesión válida y un token de un solo uso con vida de 60 s.
- Un resultado solo queda disponible para la paciente tras revisión administrativa y autorización de un rol `medico`, en ese orden. La autorización nunca es automática.
- La asociación de un PDF con una paciente siempre la confirma una persona, aunque el folio se haya leído del documento.
- Roles exactos: `laboratorio`, `administrativo`, `medico`, `paciente`.
- Estados exactos: `cargado`, `asociado`, `revisado`, `autorizado`, `notificado`, `consultado`, `fallo_envio`, `revocado`.
- Identificador de paciente: `folio` con formato `EIRA-XXXX-XXXX` (alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, último carácter verificador). El nombre nunca identifica.
- Interfaz en español, texto de 16 px o más, botones de 44 px o más, estados con texto además de color.
- Valkey se nombra "Valkey" en código, README y pitch; nunca "Redis".
- Repositorio público con licencia MIT y README con tabla "Implementado / Simulado / Para piloto". Texto legal: "alineado a", nunca "cumple" ni "certificado".
- Todo corre con `docker compose up`, sin servicios de pago obligatorios.

## Review Focus

1. Una persona intenta adivinar el código de acceso: al quinto intento fallido el folio queda bloqueado 15 minutos y el intento queda en bitácora. Prueba en Tarea 3.
2. Alguien reutiliza o comparte un enlace de descarga: el segundo uso responde 410 y no entrega el PDF. Prueba en Tarea 3 y Tarea 4.
3. Un PDF se asoció a la paciente equivocada y ya fue notificado: la corrección exige revocar primero, la paciente equivocada pierde acceso de inmediato y ambos pasos quedan en bitácora. Prueba en Tarea 2 y Tarea 4.
4. Falla el envío del aviso: tras 3 intentos el resultado pasa a `fallo_envio` y se crea una tarea de entrega asistida; nunca queda "notificado" en falso. Prueba en Tarea 3.
5. Un rol pide lo que no le toca (laboratorio pide el PDF de otro lote, paciente pide un resultado ajeno o no autorizado): responde 403 o 404 sin revelar si existe. Prueba en Tarea 4.

---

## File Structure

| Ruta | Responsabilidad | Tarea |
|---|---|---|
| `shared/types.ts` | Tipos del contrato | 1 |
| `shared/folio.ts` | Generar y validar folios | 1 |
| `server/bus.ts` | Interfaz `AccessBus` (sin implementación) | 1 |
| `server/db.ts` | Esquema SQLite y consultas | 2 |
| `server/workflow.ts` | Máquina de estados y tareas de seguimiento | 2 |
| `server/audit.ts` | Bitácora encadenada por hash | 2 |
| `server/filestore.ts` | PDF cifrados en disco | 2 |
| `server/valkeyBus.ts`, `server/memoryBus.ts` | Implementaciones de `AccessBus` | 3 |
| `server/notifier.ts` | Consumidor de la cola de avisos y proveedor simulado | 3 |
| `server/app.ts`, `server/main.ts`, `server/seed.ts` | Rutas HTTP, control por rol, datos de prueba | 4 |
| `web/src/staff/*.tsx` | Pantallas de laboratorio, administración y médico | 5 |
| `web/src/paciente/*.tsx` | Portal de la paciente y bandeja simulada | 6 |
| `web/src/lib/leerFolio.ts` | Leer el QR del PDF escaneado | 6 |
| `scripts/pdfs-sinteticos.ts` | Generar resultados ficticios con QR | 6 |
| `Dockerfile`, `compose.yaml`, `Caddyfile` | Despliegue | 7 |
| `README.md`, `LICENSE`, `docs/devpost.md` | Entrega | 8 |

Tras la Tarea 1 corren en paralelo las Tareas 2, 3, 5 y 6. La Tarea 4 integra 2 y 3. Las pantallas (5 y 6) se construyen contra el contrato HTTP de la Tarea 4, que está escrito abajo.

---

### Task 1: Andamiaje y contrato (en serie, 15 min)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore` (`.claude/`, `data/`, `node_modules/`, `dist/`, `.env`), `LICENSE` (MIT), `shared/types.ts`, `shared/folio.ts`, `server/bus.ts`
- Test: `shared/folio.test.ts`

**Interfaces:**
- Produces (`shared/types.ts`):

```ts
export type Role = 'laboratorio' | 'administrativo' | 'medico' | 'paciente';
export type Estado = 'cargado' | 'asociado' | 'revisado' | 'autorizado' | 'notificado' | 'consultado' | 'fallo_envio' | 'revocado';
export type Accion = 'asociar' | 'reasociar' | 'revisar' | 'autorizar' | 'devolver' | 'notificar' | 'marcar_fallo' | 'consultar' | 'entregar_asistida' | 'revocar';
export interface Paciente {
  id: string; folio: string;
  nombres: string; apellidoPaterno: string; apellidoMaterno: string | null;
  fechaNacimiento: string;                     // YYYY-MM-DD
  telefono: string | null; correo: string | null;
  canal: 'sms' | 'correo' | 'asistida';        // 'asistida' = sin teléfono ni correo utilizable
}
export interface Resultado {
  id: string; pacienteId: string | null; estado: Estado;
  folioLeido: string | null;                   // folio detectado en el PDF, si lo hubo
  requiereContacto: boolean | null;            // lo fija el médico al autorizar
  fechaToma: string | null;                    // YYYY-MM-DD; se captura al asociar
  cargadoPor: string; cargadoEn: string;
  notificadoEn: string | null; consultadoEn: string | null;
  entregaAsistida: boolean;
}
export type TipoTarea = 'contacto_clinico' | 'entrega_asistida';
export interface Tarea {
  id: string; resultadoId: string; tipo: TipoTarea;
  estado: 'abierta' | 'cerrada'; venceEn: string;
  intentos: { por: string; en: string; nota: string }[];
}
export interface Sesion { usuario: string; role: Role; pacienteId?: string; }
export interface FilaPanel {                   // lo que ve el panel de estados
  resultadoId: string; folio: string | null; iniciales: string | null;
  estado: Estado; diasEnEstado: number; tareaAbierta: TipoTarea | null; vencida: boolean;
  diasDesdeToma: number | null; fueraDePlazo: boolean;   // fueraDePlazo: más de 28 días desde la toma sin llegar a 'consultado'
}
```

- Produces (`server/bus.ts`):

```ts
export interface AccessBus {
  setSession(token: string, s: Sesion, ttlSeg: number): Promise<void>;
  getSession(token: string): Promise<Sesion | null>;
  revokeSessionsOf(pacienteId: string): Promise<void>;
  issueOtp(folio: string): Promise<string>;                       // 6 dígitos, TTL 300 s
  verifyOtp(folio: string, code: string): Promise<'ok' | 'incorrecto' | 'bloqueado' | 'expirado'>;
  issueDownloadToken(resultadoId: string, pacienteId: string): Promise<string>;   // TTL 60 s
  consumeDownloadToken(token: string): Promise<{ resultadoId: string; pacienteId: string } | null>;
  enqueueAviso(a: { resultadoId: string; intento: number }): Promise<void>;
  consumeAvisos(handler: (a: { resultadoId: string; intento: number }) => Promise<void>): void;
  kind: 'valkey' | 'memoria';
}
```

- Produces (`shared/folio.ts`): `newFolio(): string`, `isValidFolio(folio: string): boolean`

- [ ] **Step 1:** Inicializar el proyecto con las dependencias del Tech Stack y scripts `dev`, `build`, `start`, `test`, `seed`, `pdfs`.
- [ ] **Step 2:** Escribir `shared/types.ts` y `server/bus.ts` exactamente como arriba.
- [ ] **Step 3:** Prueba que falla:

```ts
test('folio válido y con verificador', () => {
  const f = newFolio();
  expect(f).toMatch(/^EIRA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  expect(isValidFolio(f)).toBe(true);
  expect(isValidFolio(f.slice(0, -1) + (f.endsWith('2') ? '3' : '2'))).toBe(false);
});
```

- [ ] **Step 4:** Implementar (7 caracteres aleatorios + verificador = suma de índices mod 31). `npx vitest run shared`, esperado PASS.
- [ ] **Step 5:** Commit `chore: scaffold and shared contract`; crear el repositorio público y hacer push.

### Task 2: Flujo de estados, bitácora y archivo cifrado (paralelo)

**Files:**
- Create: `server/db.ts`, `server/workflow.ts`, `server/audit.ts`, `server/filestore.ts`
- Test: `server/workflow.test.ts`, `server/audit.test.ts`, `server/filestore.test.ts`

**Interfaces:**
- Consumes: tipos de `shared/types.ts`
- Produces:
  - `openDb(path: string): Db`
  - `transition(db: Db, resultadoId: string, accion: Accion, actor: Sesion, datos?: { pacienteId?: string; requiereContacto?: boolean; nota?: string }): Resultado` — lanza `ErrorFlujo` con `codigo: 'rol' | 'estado' | 'dato'`
  - `registrarIntento(db: Db, tareaId: string, actor: Sesion, nota: string, cerrar: boolean): Tarea`
  - `panel(db: Db, role: Role): FilaPanel[]`
  - `appendAudit(db: Db, e: { actor: string; role: Role; accion: string; resultadoId: string | null; detalle: unknown }): void`
  - `verifyAudit(db: Db): { ok: boolean; brokenAt: number | null; total: number }`
  - `saveFile(id: string, pdf: Buffer): void`, `readFile(id: string): Buffer` (AES-256-GCM, clave de 32 bytes en `EIRA_FILE_KEY`, archivo `data/pdfs/<id>.bin`)

Tabla de transiciones (única fuente de verdad):

| Acción | Desde | Hacia | Rol | Efecto adicional |
|---|---|---|---|---|
| `asociar` | `cargado` | `asociado` | administrativo | fija `pacienteId` |
| `reasociar` | `asociado`, `revisado` | `asociado` | administrativo | cambia `pacienteId`; guarda el anterior en bitácora |
| `revisar` | `asociado` | `revisado` | administrativo | |
| `devolver` | `revisado` | `asociado` | medico | nota obligatoria |
| `autorizar` | `revisado` | `autorizado` | medico | `requiereContacto` obligatorio; si es `true`, crea tarea `contacto_clinico` con vencimiento a 3 días |
| `notificar` | `autorizado`, `fallo_envio` | `notificado` | administrativo o sistema | bloqueado mientras exista tarea `contacto_clinico` abierta |
| `marcar_fallo` | `autorizado` | `fallo_envio` | sistema | crea tarea `entrega_asistida` con vencimiento a 5 días |
| `consultar` | `notificado` | `consultado` | paciente dueña | fija `consultadoEn` |
| `entregar_asistida` | `autorizado`, `notificado`, `fallo_envio` | `consultado` | administrativo | `entregaAsistida = true`; cierra tarea `entrega_asistida` |
| `revocar` | cualquiera salvo `cargado` | `revocado` | administrativo, medico | nota obligatoria |
| `reasociar` | `revocado` | `asociado` | administrativo | vuelve a exigir revisión y autorización |

Paciente con `canal: 'asistida'`: al autorizar se crea además una tarea `entrega_asistida`.

Respaldo a 72 horas: `revisarSinAbrir(db: Db, ahora: Date): number` crea una tarea `entrega_asistida` (vencimiento a 5 días) por cada resultado que lleve más de 72 h en `notificado` sin tarea abierta, y devuelve cuántas creó. `main.ts` la ejecuta cada 10 minutos. Prueba: un resultado notificado hace 73 h genera una tarea; llamarla dos veces no genera una segunda; uno de 71 h no genera ninguna.

Conciliación: `conciliacion(db: Db): Record<Estado, number> & { total: number }`; la suma de los estados es igual a `total`, de modo que ningún PDF queda sin estado. Se sirve en `GET /api/panel` como `{ filas, conciliacion }`.

- [ ] **Step 1:** Pruebas que fallan (`server/workflow.test.ts`, base `:memory:`):

```ts
test('camino completo de Ana', () => {
  const r = cargar(db);
  transition(db, r.id, 'asociar', admin, { pacienteId: ana.id });
  transition(db, r.id, 'revisar', admin);
  transition(db, r.id, 'autorizar', medico, { requiereContacto: false });
  transition(db, r.id, 'notificar', admin);
  expect(transition(db, r.id, 'consultar', sesionDe(ana)).estado).toBe('consultado');
});
test('nadie salta la autorización médica', () => {
  const r = hasta(db, 'revisado');
  expect(() => transition(db, r.id, 'notificar', admin)).toThrow(expect.objectContaining({ codigo: 'estado' }));
  expect(() => transition(db, r.id, 'autorizar', admin, { requiereContacto: false })).toThrow(expect.objectContaining({ codigo: 'rol' }));
});
test('autorizar sin decir si requiere contacto falla', () => {
  expect(() => transition(db, hasta(db,'revisado').id, 'autorizar', medico)).toThrow(expect.objectContaining({ codigo: 'dato' }));
});
test('si requiere contacto se crea tarea y no se puede notificar hasta cerrarla', () => {
  const r = hasta(db, 'revisado');
  transition(db, r.id, 'autorizar', medico, { requiereContacto: true });
  const [t] = tareasDe(db, r.id);
  expect(t).toMatchObject({ tipo: 'contacto_clinico', estado: 'abierta' });
  expect(() => transition(db, r.id, 'notificar', admin)).toThrow(expect.objectContaining({ codigo: 'estado' }));
  registrarIntento(db, t.id, medico, 'Contactada por teléfono', true);
  expect(transition(db, r.id, 'notificar', admin).estado).toBe('notificado');
});
test('otra paciente no puede consultar', () => {
  const r = hasta(db, 'notificado', ana);
  expect(() => transition(db, r.id, 'consultar', sesionDe(rosa))).toThrow(expect.objectContaining({ codigo: 'rol' }));
});
test('corregir asociación ya notificada exige revocar y reinicia el flujo', () => {
  const r = hasta(db, 'notificado', ana);
  expect(() => transition(db, r.id, 'reasociar', admin, { pacienteId: rosa.id })).toThrow();
  transition(db, r.id, 'revocar', admin, { nota: 'Asociación equivocada' });
  expect(transition(db, r.id, 'reasociar', admin, { pacienteId: rosa.id }).estado).toBe('asociado');
});
test('paciente sin teléfono genera tarea de entrega asistida al autorizar', () => { ... expect(tareasDe(db, r.id)[0].tipo).toBe('entrega_asistida'); });
test('el panel no expone nombre completo ni requiereContacto', () => {
  const fila = panel(db, 'administrativo')[0];
  expect(Object.keys(fila).sort()).toEqual(['diasDesdeToma','diasEnEstado','estado','folio','fueraDePlazo','iniciales','resultadoId','tareaAbierta','vencida']);
});
test('más de 28 días desde la toma sin consultar se marca fuera de plazo', () => {
  expect(filaCon(db, { fechaToma: hace(29), estado: 'notificado' }).fueraDePlazo).toBe(true);
  expect(filaCon(db, { fechaToma: hace(27), estado: 'notificado' }).fueraDePlazo).toBe(false);
  expect(filaCon(db, { fechaToma: hace(40), estado: 'consultado' }).fueraDePlazo).toBe(false);
});
test('el panel de laboratorio solo muestra estado de carga', () => { expect(panel(db,'laboratorio')[0]).toMatchObject({ folio: null, iniciales: null, tareaAbierta: null }); });
test('tarea vencida se marca', ...);   // venceEn en el pasado → vencida === true
```

`server/audit.test.ts`: cadena íntegra verifica `{ ok:true, brokenAt:null, total:n }`; alterar la fila 1 devuelve `{ ok:false, brokenAt:1 }`; cada `transition` exitosa agrega exactamente una fila con actor, rol y acción.

`server/filestore.test.ts`: `readFile(id)` devuelve los mismos bytes que se guardaron; el archivo en disco no empieza con `%PDF`; alterar un byte del archivo hace que `readFile` lance.

- [ ] **Step 2:** `npx vitest run server/workflow.test.ts server/audit.test.ts server/filestore.test.ts`, esperado FAIL.
- [ ] **Step 3:** Implementar `server/db.ts`: tablas `pacientes`, `resultados`, `tareas`, `usuarios`, `avisos(id, resultado_id, canal, destino_enmascarado, texto, estado, en)`, `audit_log(seq, ts, actor, role, accion, resultado_id, detalle, prev_hash, hash)`. SQLite en `data/eira.sqlite`, modo WAL.
- [ ] **Step 4:** Implementar `server/audit.ts` (`hash = sha256(prev_hash + ts + actor + accion + resultado_id + detalle)`; primer `prev_hash` = 64 ceros).
- [ ] **Step 5:** Implementar `server/workflow.ts` con la tabla de transiciones como dato y todo cambio dentro de una transacción que incluye `appendAudit`.
- [ ] **Step 6:** Implementar `server/filestore.ts` (IV aleatorio de 12 bytes por archivo; `authTagLength: 16`; formato `iv | tag | cifrado`). `readFile` descifra el archivo completo en memoria y solo devuelve bytes después de que `final()` termina sin error; nunca se transmite en flujo mientras se descifra.
- [ ] **Step 7:** Correr pruebas, esperado PASS. Commit `feat: result workflow, audit chain and encrypted file store`.

### Task 3: Valkey: accesos que caducan y cola de avisos (paralelo)

**Files:**
- Create: `server/valkeyBus.ts`, `server/memoryBus.ts`, `server/notifier.ts`
- Test: `server/bus.test.ts` (misma batería contra ambas implementaciones; la de Valkey se omite si `VALKEY_URL` no está definida), `server/notifier.test.ts`

**Interfaces:**
- Consumes: `AccessBus` de `server/bus.ts`; `transition`, `Db` de la Tarea 2 (solo en `notifier.ts`)
- Produces:
  - `createBus(url?: string): Promise<AccessBus>` — usa Valkey si conecta; si no, memoria
  - `startNotifier(db: Db, bus: AccessBus, enviar: Proveedor): void`
  - `type Proveedor = (canal: 'sms' | 'correo', destino: string, texto: string) => Promise<void>`
  - `proveedorSimulado(db: Db): Proveedor` — guarda el aviso en la tabla `avisos`; falla si el destino termina en `0000`
  - `TEXTO_AVISO(url: string): string`

Claves y comandos en Valkey:

| Uso | Clave | Comandos |
|---|---|---|
| Sesión | `eira:ses:<token>`; índice `eira:ses-pac:<pacienteId>` | `SET EX`, `GET`, `SADD`, `SMEMBERS` + `DEL` para revocar |
| Código de acceso | `eira:otp:<folio>` | `SET EX 300`, `GET`, `DEL` al acertar |
| Límite de intentos | `eira:otp-int:<folio>` | `SET 0 NX EX 900` y después `INCR` (nunca `INCR` + `EXPIRE` sueltos: puede quedar una clave sin caducidad); bloquea al llegar a 5 |
| Token de descarga | `eira:dl:<token>` | `SET <json> EX 60 NX`, `GETDEL` (valor siempre string) |
| Cola de avisos | Stream `eira:avisos`, grupo `notificador` | `XGROUP CREATE eira:avisos notificador $ MKSTREAM`; `XADD eira:avisos MAXLEN ~ 1000 *`; al arrancar leer con id `0` hasta vaciar pendientes y luego `>` con `BLOCK`; `XACK` solo tras éxito |

Cliente: `import { Valkey } from 'iovalkey'` (import con nombre, no el default).

- [ ] **Step 1:** Pruebas que fallan (`server/bus.test.ts`):

```ts
test('código correcto entra una sola vez', async () => {
  const c = await bus.issueOtp(F);
  expect(await bus.verifyOtp(F, c)).toBe('ok');
  expect(await bus.verifyOtp(F, c)).toBe('expirado');
});
test('cinco fallos bloquean aunque después llegue el código correcto', async () => {
  const c = await bus.issueOtp(F);
  for (let i = 0; i < 5; i++) expect(await bus.verifyOtp(F, '000000')).toBe(i < 4 ? 'incorrecto' : 'bloqueado');
  expect(await bus.verifyOtp(F, c)).toBe('bloqueado');
});
test('el token de descarga sirve una vez', async () => {
  const t = await bus.issueDownloadToken('r1', 'p1');
  expect(await bus.consumeDownloadToken(t)).toEqual({ resultadoId: 'r1', pacienteId: 'p1' });
  expect(await bus.consumeDownloadToken(t)).toBeNull();
});
test('revocar cierra todas las sesiones de la paciente', async () => {
  await bus.setSession('t1', { usuario: 'ana', role: 'paciente', pacienteId: 'p1' }, 600);
  await bus.revokeSessionsOf('p1');
  expect(await bus.getSession('t1')).toBeNull();
});
```

`server/notifier.test.ts`:

```ts
test('el texto del aviso no contiene términos clínicos', () => {
  const t = TEXTO_AVISO('https://x.test').toLowerCase();
  for (const p of ['papanicolaou','resultado normal','anormal','negativo','positivo','lesión','vph','citología','diagnóstico'])
    expect(t).not.toContain(p);
});
test('envío correcto deja el resultado en notificado y un aviso guardado', ...);
test('tres fallos seguidos dejan fallo_envio y una tarea entrega_asistida', ...);   // destino '3410000000'
test('el destino se guarda enmascarado', ...);   // '******0001'
```

- [ ] **Step 2:** Correr, esperado FAIL.
- [ ] **Step 3:** Implementar `memoryBus.ts`, luego `valkeyBus.ts` con la tabla de claves. `verifyOtp` incrementa el contador antes de comparar.
- [ ] **Step 4:** Implementar `notifier.ts`: consume la cola; si el proveedor falla, reencola con `intento + 1`; al tercer fallo ejecuta `transition(..., 'marcar_fallo', sistema)`.
- [ ] **Step 5:** Levantar `docker run -p 6379:6379 valkey/valkey:8` y correr con `VALKEY_URL=redis://localhost:6379 npx vitest run server/bus.test.ts`, esperado PASS en ambas implementaciones. Commit `feat: Valkey access bus and notification queue`.

### Task 4: Rutas HTTP y control por rol (tras Tareas 2 y 3)

**Files:**
- Create: `server/app.ts`, `server/main.ts`, `server/seed.ts`
- Test: `server/app.test.ts`

**Interfaces:**
- Consumes: todo lo producido en Tareas 2 y 3
- Produces (JSON; `Authorization: Bearer <token>` salvo las marcadas como públicas):

| Método y ruta | Rol | Respuesta |
|---|---|---|
| `POST /api/login` (pública) `{ usuario, pin }` | personal | `{ token, role, nombre }`; usuarios: `lab1/1111`, `admin1/2222`, `medica1/3333` |
| `POST /api/resultados` (multipart `pdf`, `folioLeido?`) | laboratorio, administrativo | `Resultado`; rechaza si no es PDF o pesa más de 10 MB |
| `GET /api/panel` | personal | `{ filas: FilaPanel[]; conciliacion }` según rol |
| `GET /api/resultados/:id` | administrativo, medico | `Resultado` + `paciente` + `tareas` + `bitacora` |
| `GET /api/resultados/:id/pdf` | administrativo, medico | el PDF; registra el acceso |
| `GET /api/pacientes/buscar?q=&fechaNacimiento=&folio=` | administrativo | `Paciente[]` (máximo 5) |
| `POST /api/resultados/:id/accion` `{ accion, pacienteId?, requiereContacto?, nota? }` | según tabla de transiciones | `Resultado`; 409 con `{ codigo }` si `ErrorFlujo` |
| `POST /api/tareas/:id/intento` `{ nota, cerrar }` | administrativo, medico | `Tarea` |
| `POST /api/resultados/:id/entrega-asistida` `{ folio, fechaNacimiento }` | administrativo | `Resultado`; 403 si los datos no coinciden con la paciente asociada |
| `POST /api/paciente/codigo` (pública) `{ folio, fechaNacimiento }` | | siempre `{ enviado: true }`, exista o no el folio |
| `POST /api/paciente/entrar` (pública) `{ folio, codigo }` | | `{ token }` o 401 `{ motivo: 'incorrecto' | 'bloqueado' | 'expirado' }` |
| `GET /api/paciente/documentos` | paciente | `{ id, fecha, estado }[]` solo `notificado` o `consultado` propios |
| `POST /api/paciente/documentos/:id/descarga` | paciente | `{ url }` con token de un solo uso |
| `GET /api/descarga/:token` (pública) | | el PDF una vez; 410 después; ejecuta `consultar` |
| `GET /api/bandeja-simulada` (pública, solo demo) | | últimos avisos y códigos simulados |
| `GET /api/audit/verify` | administrativo | `{ ok, brokenAt, total }` |
| `GET /api/export.csv` | administrativo | `folio,estado,cargadoEn,notificadoEn,consultadoEn,entregaAsistida` |
| `GET /api/health` (pública) | | `{ ok: true, bus: 'valkey' | 'memoria' }` |

- [ ] **Step 1:** Pruebas que fallan (`app.request`, `memoryBus`):

```ts
test('sin token: 401', ...);
test('laboratorio no puede pedir el PDF ni el detalle: 403', ...);
test('pedir código con folio inexistente responde igual que con uno real', ...);        // mismo cuerpo y estado
test('paciente ve solo sus documentos notificados', ...);                              // el de Rosa y el autorizado-sin-notificar no aparecen
test('paciente pide descarga de documento ajeno: 404', ...);
test('el enlace de descarga funciona una vez y luego 410', ...);
test('tras descargar, el estado es consultado y hay fila en bitácora', ...);
test('revocar invalida la sesión activa de la paciente y su lista queda vacía', ...);
test('subir un archivo que no es PDF: 400', ...);
test('entrega asistida con fecha de nacimiento equivocada: 403 y queda en bitácora', ...);
test('export.csv no contiene nombre, teléfono ni correo', ...);
test('ninguna respuesta de /api/paciente/* incluye requiereContacto', ...);
```

- [ ] **Step 2:** Correr, esperado FAIL.
- [ ] **Step 3:** Implementar `app.ts` (fábrica `createApp({ db, bus })`), `main.ts` (sirve `dist/` en producción, puerto `PORT` o 8787, arranca `startNotifier`), y `seed.ts`: 12 pacientes ficticias con folio; Ana Ejemplo (1984-03-12, teléfono `3411000001`), Rosa Prueba (1979-11-02, `canal: 'asistida'`), una paciente con teléfono terminado en `0000` para el fallo de envío, y 8 resultados repartidos en todos los estados para que el panel tenga contenido.
- [ ] **Step 4:** Correr `npx vitest run`, esperado PASS. Commit `feat: HTTP API with role enforcement and patient access`.

### Task 5: Pantallas del personal (paralelo, contra el contrato de la Tarea 4)

**Files:**
- Create: `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/api.ts`, `web/src/styles.css`, `web/src/staff/Login.tsx`, `web/src/staff/Panel.tsx`, `web/src/staff/Cargar.tsx`, `web/src/staff/Detalle.tsx`, `web/src/staff/Tareas.tsx`, `web/src/staff/EntregaAsistida.tsx`
- Test: `web/src/staff/Detalle.test.tsx`

- [ ] **Step 1:** Prueba que falla:

```tsx
test('autorizar exige elegir si requiere contacto', () => {
  render(<Detalle resultado={revisado} role="medico" />);
  expect(screen.getByRole('button', { name: 'Autorizar' })).toBeDisabled();
  userEvent.click(screen.getByLabelText('No requiere contacto'));
  expect(screen.getByRole('button', { name: 'Autorizar' })).toBeEnabled();
});
test('administrativo no ve el botón Autorizar', ...);
test('asociar muestra paciente y documento lado a lado y exige confirmar', ...);   // botón "Confirmo que es la misma persona"
```

- [ ] **Step 2:** Implementar. Decisiones fijas:
  - **Panel**: una columna por estado con conteo, y arriba una franja "Requieren atención" con tareas vencidas primero. Cada fila: folio, iniciales, días en el estado. Sin nombres completos ni hallazgos.
  - **Cargar**: arrastrar uno o varios PDF; por cada uno llama `leerFolio` (Tarea 6) y muestra "Folio detectado: EIRA-…" o "Sin folio: asociar a mano".
  - **Detalle**: PDF a la izquierda; a la derecha la paciente propuesta con nombre, fecha de nacimiento y folio, y el botón "Confirmo que es la misma persona". Debajo, las acciones que permite el rol, y la bitácora del resultado.
  - **Tareas**: lista de `contacto_clinico` y `entrega_asistida` con vencimiento; "Registrar intento" con nota y casilla "Paciente contactada".
  - **EntregaAsistida**: pide folio (tecleado, o leído por NFC si `'NDEFReader' in window`) y fecha de nacimiento; si coinciden, muestra el PDF para imprimir o enseñar y registra quién entregó.
- [ ] **Step 3:** Correr `npx vitest run web/src/staff`, esperado PASS. Commit `feat: staff screens`.

### Task 6: Portal de la paciente, lectura de folio y PDF sintéticos (paralelo)

**Files:**
- Create: `web/src/paciente/Entrar.tsx`, `web/src/paciente/Documentos.tsx`, `web/src/paciente/BandejaSimulada.tsx`, `web/src/lib/leerFolio.ts`, `web/src/lib/nfc.ts`, `scripts/pdfs-sinteticos.ts`
- Test: `web/src/lib/leerFolio.test.ts`, `web/src/paciente/Entrar.test.tsx`

**Interfaces:**
- Produces:
  - `leerFolio(pdf: ArrayBuffer): Promise<string | null>` — renderiza la página 1 con pdfjs-dist a 2x, busca un QR con jsQR y devuelve su texto solo si `isValidFolio`
  - `leerFolioNfc(): Promise<string | null>` — `NDEFReader.scan()`, primer registro de texto; devuelve `null` si el navegador no lo soporta
  - `npm run pdfs` genera en `data/sinteticos/`: `ana-ejemplo.pdf` (con QR del folio de Ana), `rosa-prueba.pdf` (con QR), `sin-folio.pdf` (sin QR). Cada uno lleva la leyenda "DOCUMENTO FICTICIO PARA DEMOSTRACIÓN" y ningún dato real.

- [ ] **Step 1:** Pruebas que fallan:

```ts
test('lee el folio del PDF sintético con QR', async () => { expect(await leerFolio(pdfConQr)).toBe(FOLIO_ANA); });
test('PDF sin QR devuelve null', async () => { expect(await leerFolio(pdfSinQr)).toBeNull(); });
test('QR con texto que no es folio devuelve null', async () => { expect(await leerFolio(pdfConQrAjeno)).toBeNull(); });
```

```tsx
test('el mensaje tras pedir código es el mismo exista o no el folio', ...);
test('código bloqueado muestra cuándo reintentar y cómo pedir ayuda', ...);   // texto: "Acude a tu punto EIRA con tu folio"
```

- [ ] **Step 2:** Implementar `scripts/pdfs-sinteticos.ts` (pdf-lib + qrcode) y correr `npm run pdfs`.
- [ ] **Step 3:** Implementar `leerFolio.ts` y `nfc.ts`. El worker de pdf.js se importa con `pdfjs-dist/build/pdf.worker.min.mjs?url`, de la misma versión que `pdfjs-dist`. El QR de los PDF sintéticos mide al menos 3 cm de lado; si jsQR no lo detecta a 2x, reintentar a 3x. `leerFolioNfc` solo se llama desde un clic (Web NFC exige gesto del usuario, Chrome en Android y HTTPS) y decodifica con `new TextDecoder(record.encoding).decode(record.data)`.
- [ ] **Step 4:** Implementar pantallas. Decisiones fijas:
  - **Entrar**: dos pasos, un campo por pantalla, letra grande: (1) folio y fecha de nacimiento, (2) código de 6 dígitos. Texto de ayuda: "¿No tienes celular? Acude a tu punto EIRA con tu folio."
  - **Documentos**: lista con fecha y botón "Ver documento"; abre el PDF mediante el enlace de un solo uso. Sin vista previa ni texto clínico en la lista.
  - **BandejaSimulada** (`/bandeja-simulada`): muestra los avisos y códigos "enviados", con rótulo fijo "SIMULACIÓN: en un piloto esto llega por SMS o correo".
- [ ] **Step 5:** Correr `npx vitest run web/src/lib web/src/paciente`, esperado PASS. Commit `feat: patient portal, folio reading and synthetic PDFs`.

### Task 7: Despliegue

**Files:**
- Create: `Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example`

- [ ] **Step 1:** `Dockerfile` multi-etapa sobre `node:22-slim` (better-sqlite3 necesita compilar; evitar alpine). `compose.yaml`: `app`, `valkey` (`valkey/valkey:8`, `--appendonly yes`, volumen) y `caddy` (80 y 443 → `app:8787`). Volumen para `data/`. `.env.example` con `EIRA_FILE_KEY`, `VALKEY_URL`, `PUBLIC_URL`.
- [ ] **Step 2:** `docker compose up --build` en este VPS; `curl -s localhost:8787/api/health` debe devolver `{"ok":true,"bus":"valkey"}`.
- [ ] **Step 3:** Ian levanta la misma `compose.yaml` en AWS (EC2 con Docker; dominio `<ip-con-guiones>.sslip.io` en `Caddyfile` para HTTPS automático). Respaldo: la instancia de este VPS.
- [ ] **Step 4:** Recorrer la Tarea 9 en la URL pública. Commit `chore: container deploy with Valkey and HTTPS`.

### Task 8: README y texto de Devpost (durante la comida)

**Files:**
- Create: `README.md`, `docs/devpost.md`

- [ ] **Step 1:** `README.md`, en este orden: Qué resuelve (3 líneas); Cómo levantarlo y usuarios de prueba; Recorrido del caso Ana Ejemplo y del segundo resultado; Arquitectura (diagrama de texto, tabla de estados, qué hace Valkey y qué pasa si se cae); Tabla Implementado / Simulado / Para piloto; Qué ocurre ante error de identidad y ante fallo de envío; Privacidad y seguridad; Operación (quién administra, capacitación, respaldo, contingencia en papel); Costos mensuales estimados; Riesgos; Supuestos validados con EIRA (sus respuestas textuales); Preguntas abiertas; Licencia.
- [ ] **Step 2:** La tabla declara como **simulado**: envío de SMS y correo (bandeja simulada), autenticación del personal (PIN, sin segundo factor), los PDF y las pacientes. Como **para piloto**: análisis jurídico de datos sensibles y aviso de privacidad con consentimiento, proveedor real de SMS y correo, almacenamiento administrado con cifrado y respaldo, gestión de la clave de cifrado, pruebas con personal de EIRA y del laboratorio.
- [ ] **Step 3:** `docs/devpost.md`: título, lema, y un párrafo por criterio (Usabilidad, Impacto, Escalabilidad, Privacidad y confianza, Innovación, Funcionamiento real), cada uno con una evidencia verificable en el prototipo.
- [ ] **Step 4:** Commit `docs: README and submission text`.

### Task 9: Prueba de punta a punta y entrega

- [ ] **Step 1:** `lab1` sube `ana-ejemplo.pdf` y `rosa-prueba.pdf`. Cada uno muestra su folio detectado. El panel de laboratorio no muestra pacientes.
- [ ] **Step 2:** `admin1` abre el de Ana, ve documento y paciente lado a lado, confirma y marca revisado.
- [ ] **Step 3:** `medica1` autoriza el de Ana con "No requiere contacto".
- [ ] **Step 4:** La bandeja simulada muestra el aviso; su texto no menciona estudio ni resultado.
- [ ] **Step 5:** En el segundo dispositivo, Ana entra con folio y fecha de nacimiento, recibe el código en la bandeja simulada, entra y abre su documento. El panel pasa a `consultado`.
- [ ] **Step 6:** Copiar el enlace de descarga y abrirlo otra vez: responde 410.
- [ ] **Step 7:** `medica1` autoriza el de Rosa con "Requiere contacto": aparece la tarea, no hay aviso, y `admin1` no puede notificar.
- [ ] **Step 8:** `medica1` registra el contacto y cierra la tarea; Rosa no tiene teléfono, así que `admin1` hace la entrega asistida con folio (NFC si hay Android, tecleado si no) y fecha de nacimiento.
- [ ] **Step 9:** `admin1` revoca el resultado de Ana: su sesión deja de mostrar el documento.
- [ ] **Step 10:** Bitácora del resultado completa; "Verificar integridad" correcto; CSV sin datos personales.
- [ ] **Step 11:** 15:00 corte. Video de respaldo de 90 s (pasos 1 a 8). 15:20 envío a Devpost. 15:40 tres ensayos del pitch.

---

# Parte B. Estrategia

## Evidencia que respalda el diseño

Cifras tomadas de resúmenes de buscador, no de los textos completos; en el README se citan con enlace y sin redondear a favor.

- El programa de tamizaje del NHS envía el resultado por app y, si no se lee en 72 h, manda carta: de ahí el respaldo a 72 horas.
- Fallas silenciosas en programas grandes (Capita 2018, CervicalCheck 2019) dejaron a miles de mujeres sin resultado por procesos manuales: de ahí la conciliación del panel.
- El SMS por sí solo no mejora el seguimiento; funciona junto con escalamiento a una persona (estudio ATICA, Jujuy): de ahí las tareas con responsable y vencimiento.
- Nombre y apellido se repiten en una proporción alta de registros; con fecha de nacimiento baja mucho: de ahí folio más fecha de nacimiento.
- Compartir celular reduce la asistencia a tratamiento, y las pacientes eligen canales distintos (SMS, llamada, clínica, visita): de ahí el canal por paciente y la entrega en ventanilla.

Leído en fuente primaria y citable en README y pitch:

- NOM-014-SSA2-1994, numeral 8.4: la mujer debe conocer su resultado en menos de cuatro semanas desde la toma (https://dof.gob.mx/normasOficiales/2383/SALUD/SALUD.htm). De ahí el indicador "fuera de plazo" a 28 días del panel.
- NOM-004-SSA3-2012: conservación mínima de 5 años; entrega a terceros solo con solicitud escrita de la paciente o su representante (https://dof.gob.mx/normasOficiales/4909/SALUD/SALUD.html). De ahí que la entrega en ventanilla sea solo a la paciente.
- GLOBOCAN 2024, México: 11,919 casos nuevos y 4,967 muertes al año por cáncer cervicouterino (https://gco.iarc.who.int/media/globocan/factsheets/populations/484-mexico-fact-sheet.pdf).
- INSP 2021: solo la mitad de las mujeres con tamizaje positivo acude a colposcopía (https://www.insp.mx/assets/documents/webinars/2021/CISP_Cancer_Cervical.pdf).
- INEGI ENDUTIH 2025: 15.4 % de la población no usa celular; internet 75.2 % rural frente a 88.9 % urbano (https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/endutih/ENDUTIH_25.pdf).
- Política de WhatsApp Business: prohíbe enviar información de salud donde la regulación exige requisitos reforzados y puede restringir cuentas (https://whatsappbusiness.com/policy/).

No citar como hecho: artículos numerados de la LFPDPPP de 2025 (el texto oficial no cargó), contenido de la NOM-024, precio del SMS a México.

Costo mensual estimado para el README (USD, marcado como estimación): instancia pequeña 12 a 13, Valkey administrado mínimo 6, correo menos de 1, disco e IP 5; total cercano a 25 sin SMS. El SMS se presenta como costo por verificar.

Listas completas de fuentes: `docs/fuentes/` (se copian del directorio de trabajo en la Tarea 8).

## Las tres piezas con nombre

1. **Folio desde la solicitud.** El PDF se asocia leyendo un código, no un nombre; una persona confirma. Ataca "entregar a la persona equivocada" en su origen.
2. **Nadie se queda sin llamada.** El resultado que requiere contacto genera una tarea con responsable, intentos y vencimiento, y bloquea el aviso hasta que alguien habló con la paciente. El sistema organiza; la decisión clínica es humana.
3. **Entrega en ventanilla.** La paciente sin celular recoge con su folio (tarjeta NFC o tecleado) y fecha de nacimiento, y queda registrado quién entregó.

## Preguntas para EIRA (Reto 4) y lo que fijan en el plan

| # | Pregunta | Qué fija | Supuesto mientras tanto |
|---|---|---|---|
| 1 | "Cuando hoy mandan un resultado por WhatsApp, ¿cómo confirman que ese número es de la paciente? Si tuvieran que pedirle algo para estar seguras, ¿qué sería?" | Factores de `POST /api/paciente/codigo` y de la entrega asistida | Folio + fecha de nacimiento + código al celular |
| 2 | "Del último lote, ¿cuántos salieron anormales y a cuántas no han localizado? En esos casos, ¿la paciente recibe el documento antes o después de la llamada?" | La regla que bloquea `notificar` con tarea abierta, y el vencimiento de 3 días | Primero la llamada; 3 días |
| 3 | "De cada diez pacientes, ¿cuántas no tienen celular propio o lo comparten? ¿Cómo les llega hoy su resultado?" | Peso de la entrega asistida y si entra NFC; si el código puede ir a un celular compartido | Canal `asistida` en ventanilla; el aviso nunca dice de qué es |
| 4 | "¿Quién escanea, quién revisa y quién autoriza hoy? ¿El resultado del laboratorio trae algún folio o solo el nombre, y alguna vez llegó o casi llegó a otra persona?" | Roles de la tabla de transiciones; si el laboratorio sube directo; viabilidad del folio en la solicitud | Laboratorio puede subir; EIRA pega una etiqueta con folio en la solicitud |
| 5 | "Los 300 al mes, ¿llegan en lotes? ¿Cuántos días pasan desde que reciben el papel hasta que la paciente lo tiene? ¿Quién administraría esto y qué tendría que hacer para que el lunes lo probaran?" | Carga por lotes en `Cargar`; el número de apertura del pitch; costos y operación del README | Lotes semanales; administra coordinación sin personal de sistemas |

Orden si hay poco tiempo: 2, 4, 1, 3, 5. Las respuestas van textuales en el README y una abre el pitch.

## Qué mostrar a cada juez

| Juez | Qué mira | Momento |
|---|---|---|
| Martí Cristobal | Ingeniería detrás del vibecoding | "El flujo es una tabla de transiciones: nadie puede saltarse la autorización médica, y está probado" |
| Roberto Luna Rojas | Valkey con trabajo real | "El enlace de descarga vive 60 segundos en Valkey y se borra al usarse; el código de acceso también caduca ahí" |
| Valeria Rivera Contreras | Seguridad, despliegue, portabilidad | PDF cifrados, bitácora verificable, un `docker compose up` |
| Gael Hernández | Uso de Devin (inferido) | Un PR de Devin enlazado en el README |
| Ximena Cruz | Usabilidad y narrativa (inferido) | La paciente sin celular que recoge en ventanilla |
| Jazmin Reyes Serrano | Sin identificar | Cumplimiento literal de los límites de EIRA |

## Pitch de 2 minutos

- 0:00–0:15 "EIRA entrega más de 300 resultados al mes por WhatsApp. Cuando les bloquean la cuenta, se detiene todo." (más el dato que dé EIRA)
- 0:15–0:45 Carga del PDF, folio detectado, confirmación humana, autorización médica.
- 0:45–1:10 Aviso sin datos clínicos; en el segundo dispositivo Ana entra con su código y abre su documento; el enlace reutilizado ya no sirve.
- 1:10–1:35 Segundo resultado: requiere contacto, se crea la tarea, no sale aviso; entrega en ventanilla con el folio.
- 1:35–1:50 Qué es real y qué es simulado; costo mensual; un comando para levantarlo.
- 1:50–2:00 "Ningún resultado a la persona equivocada, y ninguna paciente sin llamada."

## Lo que hace Ian en sala

1. Las cinco preguntas a EIRA; pedir un ejemplo ficticio de resultado para imitar su formato.
2. Cupón de Devin y un cambio acotado para tener un PR que mostrar.
3. Confirmar con la organización: programar en la comida, quiénes presentan, si Devpost exige video.
4. Instancia en AWS (Tarea 7, paso 3) y decir qué son los dos dispositivos NFC.

## Fuera de alcance y por qué

- Envío real de SMS y correo: SES en modo de prueba solo envía a direcciones verificadas y el SMS a México exige registro previo; se simula y se declara.
- Lectura automática del contenido del resultado: el sistema nunca interpreta el hallazgo; lo decide el personal médico.
- Aplicación móvil y WhatsApp como canal: el reto pide dejar de depender de él.
- Integración con el expediente del Reto 1: se menciona como siguiente paso; el folio es el punto de unión.

## Sin verificar

- Respuestas de EIRA a las cinco preguntas (los supuestos están en la tabla).
- Si el laboratorio aceptaría una etiqueta con folio en la solicitud.
- Tipo de los dos dispositivos NFC; el plan funciona sin ellos.
- Identidad de la jueza Jazmin Reyes Serrano y pesos de los criterios.
- Cifras de salud pública y marco legal: llegan con la investigación en curso y solo entran al README con fuente.
