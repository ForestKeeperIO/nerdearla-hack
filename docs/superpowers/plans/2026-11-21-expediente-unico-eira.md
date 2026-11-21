# Expediente Único EIRA (Reto 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una PWA que registra y reconoce pacientes recurrentes de EIRA sin internet, sincroniza con detección de conflictos y nunca vincula expedientes sin confirmación humana, demostrando de punta a punta el caso "María Ejemplo".

**Architecture:** Cliente local-first (React + IndexedDB) que escribe todo cambio en una cola local (`outbox`) y lo envía al servidor cuando hay red. El servidor (Hono + SQLite) es el sistema de registro, aplica cada mutación con control de versión y devuelve `applied | duplicate | conflict`. Valkey lleva el flujo ordenado de cambios (Stream), el índice de bloqueo para coincidencias (Sets), las sesiones con TTL y el aviso en vivo entre equipos (Pub/Sub). La lógica de coincidencias vive en `shared/` y corre igual en navegador (sin conexión) y servidor.

**Tech Stack:** Node 22, TypeScript, Vite + React 18, Dexie 4 (IndexedDB), vite-plugin-pwa, Hono + @hono/node-server, better-sqlite3, iovalkey (cliente Valkey), Vitest, Docker Compose (app + `valkey/valkey:8`), Caddy para HTTPS.

**Spec:** Guía de EIRA, sección "RETO 1" y secciones 5 y 6: https://drive.google.com/file/d/1W-t7xGprXyj7PjzC7iCw32aiDgoZGXXl/view. Reglas: https://vibeathon-mexico-2026.devpost.com/rules. Estrategia, jurado y pitch: Parte B de este documento.

## Global Constraints

- Nada de código antes de las 10:30 CDMX del 2026-11-21; envío en Devpost antes de las 16:00. Corte de funciones a las 15:00.
- Solo datos ficticios. Nombres de prueba: "María Ejemplo", municipio "Villa Ejemplo".
- El nombre nunca es identificador. Identificador interno: `id` UUID v4; identificador legible: `folio` con formato `EIRA-XXXX-XXXX` (alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, último carácter es dígito verificador).
- Nunca vincular ni fusionar expedientes automáticamente, ni con puntaje 1.0. Toda vinculación pasa por `link.decide` con un usuario identificado.
- Actualizar un dato nunca borra el valor anterior: cada cambio de campo queda en la bitácora con valor previo y nuevo.
- Roles exactos: `captura`, `clinico`, `admin`. `captura` no recibe `antecedentes` ni `observaciones` desde el servidor.
- Toda la interfaz en español, texto de 16 px o más, botones de 44 px o más, usable con teclado en laptop.
- Repositorio público con licencia MIT y README con tabla "Implementado / Simulado / Para piloto".
- Valkey se nombra "Valkey" en código, README y pitch; nunca "Redis".
- Sin servicios de pago obligatorios: todo corre con `docker compose up`.
- Tiempo real de código: 10:30–13:30 y 14:30–15:30 (4 horas). La sincronización no depende de Background Sync (solo Chromium): usa el evento `online`, un temporizador y el botón "Sincronizar".
- El alta exige registrar el consentimiento (casilla + versión del aviso de privacidad + fecha). La CURP es opcional y solo sirve como atributo de coincidencia, nunca como llave ni como credencial.
- Texto legal: citar la LFPDPPP de 2025 (autoridad: Secretaría Anticorrupción y Buen Gobierno; el INAI ya no existe) y decir "alineado a NOM-024-SSA3-2012", nunca "certificado" ni "cumple".

## Review Focus

1. La misma mutación llega dos veces (reintento tras corte de red): el servidor responde `duplicate` y no crea un segundo registro. Prueba en Tarea 3.
2. Dos equipos sin conexión editan el mismo expediente: el segundo recibe `conflict` con ambos valores y ninguno se pierde. Prueba en Tarea 3.
3. Homónimas: mismo nombre y distinta fecha de nacimiento aparecen como `posible` con advertencia, nunca como la misma persona. Prueba en Tarea 2.
4. Nombres con acentos, ñ, "Ma." y sin apellido materno coinciden con su forma completa. Prueba en Tarea 2.
5. Se cierra el navegador sin conexión con capturas pendientes: al reabrir, la cola sigue ahí y se envía. Prueba en Tarea 4.

---

## File Structure

| Ruta | Responsabilidad | Dueño |
|---|---|---|
| `shared/types.ts` | Tipos del contrato cliente-servidor | Tarea 1 |
| `shared/folio.ts` | Generar y validar folios | Tarea 1 |
| `shared/matching.ts` | Normalizar nombres, claves de bloqueo, puntaje | Tarea 2 |
| `server/db.ts` | Esquema SQLite y acceso | Tarea 3 |
| `server/apply.ts` | Aplicar mutaciones con control de versión | Tarea 3 |
| `server/audit.ts` | Bitácora encadenada por hash | Tarea 3 |
| `server/valkey.ts` | Stream de cambios, índice de bloqueo, sesiones, pub/sub | Tarea 3 |
| `server/app.ts` | Rutas HTTP y control por rol | Tarea 3 |
| `server/seed.ts` | Datos ficticios del caso práctico | Tarea 3 |
| `web/src/local/db.ts` | Esquema Dexie | Tarea 4 |
| `web/src/local/sync.ts` | Cola local, envío, recepción, conflictos | Tarea 4 |
| `web/src/screens/*.tsx` | Pantallas | Tarea 5 |
| `web/src/components/*.tsx` | Barra de estado, tarjeta de coincidencia, tarjeta con folio | Tarea 5 |
| `Dockerfile`, `compose.yaml`, `Caddyfile` | Despliegue | Tarea 6 |
| `README.md`, `LICENSE`, `docs/devpost.md` | Entrega | Tarea 7 |

Las Tareas 2, 3, 4 y 5 corren en paralelo después de la Tarea 1; cada una toca solo sus archivos.

---

### Task 1: Andamiaje y contrato (10:30–10:45, en serie)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore` (incluye `.claude/`, `data/`, `node_modules/`, `dist/`), `LICENSE` (MIT), `shared/types.ts`, `shared/folio.ts`
- Test: `shared/folio.test.ts`

**Interfaces:**
- Produces (`shared/types.ts`):

```ts
export type Role = 'captura' | 'clinico' | 'admin';
export interface Patient {
  id: string; folio: string;
  nombres: string; apellidoPaterno: string; apellidoMaterno: string | null;
  fechaNacimiento: string;            // YYYY-MM-DD
  curp: string | null; telefono: string | null; correo: string | null;
  municipio: string;
  consentimiento: { versionAviso: string; fecha: string } | null;   // obligatorio en el alta desde la interfaz
  antecedentes: Record<string, string> | null;   // solo clinico y admin
  version: number; updatedAt: string;
}
export type ServiceType = 'papanicolaou' | 'ultrasonido_mama' | 'exploracion_clinica' | 'valoracion_nutricional';
export interface Visit {
  id: string; patientId: string; fecha: string; sede: string; municipio: string;
  servicio: ServiceType; observaciones: string | null;   // solo clinico y admin
  createdBy: string; createdAt: string;
}
export type MutationType = 'patient.create' | 'patient.update' | 'visit.create' | 'link.decide';
export interface Mutation {
  id: string; type: MutationType; entityId: string;
  baseVersion: number | null;          // null en altas
  payload: Record<string, unknown>;
  actor: string; deviceId: string; createdAt: string;
}
export interface SyncResult {
  mutationId: string; status: 'applied' | 'duplicate' | 'conflict' | 'forbidden';
  serverVersion?: number;
  conflict?: { field: string; mine: unknown; theirs: unknown; theirActor: string; theirAt: string }[];
}
export interface LinkDecision { patientId: string; candidateId: string; decision: 'misma' | 'distinta'; }
export type MatchLevel = 'probable' | 'posible';
export interface MatchReason { campo: string; tipo: 'coincide' | 'parecido' | 'difiere'; detalle: string; }
export interface MatchCandidate { patient: Patient; score: number; level: MatchLevel; reasons: MatchReason[]; }
```

- Produces (`shared/folio.ts`): `newFolio(): string`, `isValidFolio(folio: string): boolean`

- [ ] **Step 1:** `npm init`, instalar dependencias del Tech Stack, scripts `dev` (Vite + `tsx watch server/main.ts`), `build`, `start`, `test`.
- [ ] **Step 2:** Escribir `shared/types.ts` exactamente como arriba.
- [ ] **Step 3:** Prueba que falla:

```ts
test('folio valido y con verificador', () => {
  const f = newFolio();
  expect(f).toMatch(/^EIRA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  expect(isValidFolio(f)).toBe(true);
  const roto = f.slice(0, -1) + (f.endsWith('2') ? '3' : '2');
  expect(isValidFolio(roto)).toBe(false);
});
```

- [ ] **Step 4:** Implementar `newFolio` e `isValidFolio` (7 caracteres aleatorios + verificador = suma de índices mod 31). Correr `npx vitest run shared/folio.test.ts`, esperado PASS.
- [ ] **Step 5:** Commit `chore: scaffold and shared contract`. Crear el repo público en GitHub y hacer push.

### Task 2: Coincidencias de pacientes (paralelo)

**Files:**
- Create: `shared/matching.ts`
- Test: `shared/matching.test.ts`

**Interfaces:**
- Consumes: `Patient`, `MatchCandidate`, `MatchReason` de `shared/types.ts`
- Produces:
  - `normalizeName(s: string): string`
  - `blockKeys(p: Pick<Patient,'apellidoPaterno'|'fechaNacimiento'|'curp'|'telefono'>): string[]`
  - `scoreMatch(a: PatientQuery, b: Patient): { score: number; reasons: MatchReason[] }`
  - `findCandidates(q: PatientQuery, pool: Patient[]): MatchCandidate[]` (ordenado por puntaje descendente)
  - `type PatientQuery = Pick<Patient,'nombres'|'apellidoPaterno'|'apellidoMaterno'|'fechaNacimiento'|'curp'|'telefono'>`

- [ ] **Step 1:** Pruebas que fallan:

```ts
const maria: Patient = { id:'p1', folio:'EIRA-AAAA-AAA2', nombres:'María', apellidoPaterno:'Ejemplo', apellidoMaterno:'López',
  fechaNacimiento:'1984-03-12', curp:null, telefono:'3411000001', correo:null, municipio:'Villa Ejemplo',
  antecedentes:null, version:1, updatedAt:'2026-02-10T10:00:00Z' };
const q = (o: Partial<PatientQuery>): PatientQuery => ({ nombres:'María', apellidoPaterno:'Ejemplo', apellidoMaterno:'López',
  fechaNacimiento:'1984-03-12', curp:null, telefono:null, ...o });

test('normaliza acentos, ñ, mayúsculas y abreviaturas', () => {
  expect(normalizeName('  MARÍA  de la Peña ')).toBe('maria pena');
  expect(normalizeName('Ma. Guadalupe')).toBe('maria guadalupe');
});
test('misma persona escrita distinto es probable', () => {
  const [c] = findCandidates(q({ nombres:'Maria', apellidoMaterno:null }), [maria]);
  expect(c.level).toBe('probable');
  expect(c.score).toBeGreaterThanOrEqual(0.85);
});
test('error de dedo en apellido sigue apareciendo', () => {
  expect(findCandidates(q({ apellidoPaterno:'Ejenplo' }), [maria])).toHaveLength(1);
});
test('homónima con otra fecha de nacimiento es posible, nunca probable', () => {
  const [c] = findCandidates(q({ fechaNacimiento:'1991-07-30' }), [maria]);
  expect(c.level).toBe('posible');
  expect(c.reasons).toContainEqual(expect.objectContaining({ campo:'fechaNacimiento', tipo:'difiere' }));
});
test('persona sin relación no aparece', () => {
  expect(findCandidates(q({ nombres:'Rosa', apellidoPaterno:'Prueba', fechaNacimiento:'1970-01-01' }), [maria])).toHaveLength(0);
});
test('día y mes invertidos se marca como parecido', () => {
  const [c] = findCandidates(q({ fechaNacimiento:'1984-12-03' }), [maria]);
  expect(c.reasons).toContainEqual(expect.objectContaining({ campo:'fechaNacimiento', tipo:'parecido' }));
});
```

- [ ] **Step 2:** `npx vitest run shared/matching.test.ts`, esperado FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar. Decisiones fijas:
  - `normalizeName`: minúsculas, NFD sin diacríticos, `ñ`→`n`, expande `ma.`/`ma`→`maria` y `j.`→`jose` solo como primer token, quita partículas `de`, `del`, `la`, `las`, `los`, colapsa espacios.
  - Similitud de texto: Jaro-Winkler implementado en el archivo (sin dependencia).
  - Pesos: apellido paterno 0.30, nombres 0.25, fecha de nacimiento 0.30, apellido materno 0.10, teléfono 0.05. Campo ausente en cualquiera de los dos lados: su peso se reparte entre los demás.
  - Fecha: igual = 1; día y mes invertidos o un dígito distinto = 0.6 (`parecido`); otro caso = 0 (`difiere`).
  - CURP igual en ambos: puntaje 1.0. CURP distinto en ambos: puntaje máximo 0.5.
  - Niveles: `probable` si puntaje ≥ 0.85; `posible` si ≥ 0.60; menor no se devuelve. Fecha `difiere` limita el nivel a `posible`.
  - `blockKeys`: `ap:<primeras 4 letras normalizadas del paterno>`, `fn:<YYYY-MM-DD>`, `curp:<curp>`, `tel:<últimos 7 dígitos>`; omite las de campos nulos.
- [ ] **Step 4:** Correr pruebas, esperado PASS.
- [ ] **Step 5:** Commit `feat: patient matching with explained reasons`.

### Task 3: Servidor, sincronización, bitácora y Valkey (paralelo)

**Files:**
- Create: `server/db.ts`, `server/apply.ts`, `server/audit.ts`, `server/valkey.ts`, `server/app.ts`, `server/main.ts`, `server/seed.ts`
- Test: `server/apply.test.ts`, `server/audit.test.ts`, `server/app.test.ts`

**Interfaces:**
- Consumes: tipos de `shared/types.ts`; `blockKeys`, `findCandidates` de `shared/matching.ts`; `newFolio` de `shared/folio.ts`
- Produces (HTTP, JSON, cabecera `Authorization: Bearer <token>` salvo login y health):
  - `POST /api/login` `{ usuario, pin }` → `{ token, role, nombre }`; 401 si falla. Usuarios sembrados: `captura1/1111`, `clinica1/2222`, `admin1/3333`. Token en Valkey `sess:<token>` con TTL 43200 s.
  - `POST /api/sync/push` `{ mutations: Mutation[] }` → `{ results: SyncResult[] }`
  - `GET /api/sync/pull?since=<streamId|0>&municipio=<nombre>` → `{ patients: Patient[]; visits: Visit[]; cursor: string }` filtrado por rol
  - `GET /api/patients/candidates` (query con los campos de `PatientQuery`) → `MatchCandidate[]`
  - `GET /api/events` (SSE) → eventos `change` `{ entity, entityId, actor }`
  - `GET /api/audit?entityId=` (clinico, admin) y `GET /api/audit/verify` (admin) → `{ ok: boolean; brokenAt: number | null; total: number }`
  - `GET /api/export.csv` (admin): una fila por visita con `folio, municipio, servicio, fecha, grupoEdad`; sin nombre, teléfono, correo ni CURP
  - `GET /api/health` → `{ ok: true, valkey: boolean }`
- Produces (funciones):
  - `applyMutation(db, m: Mutation, role: Role): SyncResult`
  - `appendAudit(db, e: { actor: string; role: Role; action: string; entity: string; entityId: string; detail: unknown }): void`
  - `verifyAudit(db): { ok: boolean; brokenAt: number | null; total: number }`

- [ ] **Step 1:** Pruebas que fallan en `server/apply.test.ts` (base `:memory:`):

```ts
test('alta crea paciente versión 1 con folio', () => {
  const r = applyMutation(db, create('m1','p1'), 'captura');
  expect(r).toMatchObject({ status:'applied', serverVersion:1 });
  expect(isValidFolio(getPatient(db,'p1')!.folio)).toBe(true);
});
test('la misma mutación dos veces es duplicate y no duplica', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  expect(applyMutation(db, create('m1','p1'), 'captura').status).toBe('duplicate');
  expect(countPatients(db)).toBe(1);
});
test('edición con versión base vieja es conflict y conserva ambos valores', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  applyMutation(db, update('m2','p1',1,{ telefono:'3411000002' },'captura1'), 'captura');
  const r = applyMutation(db, update('m3','p1',1,{ telefono:'3411000003' },'captura2'), 'captura');
  expect(r.status).toBe('conflict');
  expect(r.conflict).toEqual([expect.objectContaining({ field:'telefono', mine:'3411000003', theirs:'3411000002', theirActor:'captura1' })]);
  expect(getPatient(db,'p1')!.telefono).toBe('3411000002');
});
test('ediciones de campos distintos con versión vieja se aplican sin conflicto', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  applyMutation(db, update('m2','p1',1,{ telefono:'3411000002' }), 'captura');
  expect(applyMutation(db, update('m3','p1',1,{ correo:'maria@example.org' }), 'captura').status).toBe('applied');
});
test('captura no puede escribir antecedentes', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  expect(applyMutation(db, update('m2','p1',1,{ antecedentes:{ gestas:'2' } }), 'captura').status).toBe('forbidden');
});
test('cada cambio guarda valor previo y nuevo en bitácora', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  applyMutation(db, update('m2','p1',1,{ telefono:'3411000002' }), 'captura');
  expect(auditFor(db,'p1').at(-1)!.detail).toMatchObject({ telefono:{ antes:'3411000001', despues:'3411000002' } });
});
test('la visita no cambia la versión del paciente', () => {
  applyMutation(db, create('m1','p1'), 'captura');
  applyMutation(db, visit('m2','v1','p1'), 'captura');
  expect(getPatient(db,'p1')!.version).toBe(1);
});
```

`server/audit.test.ts`:

```ts
test('bitácora íntegra verifica', () => { appendAudit(db,e1); appendAudit(db,e2); expect(verifyAudit(db)).toEqual({ ok:true, brokenAt:null, total:2 }); });
test('alterar una fila rompe la cadena en esa fila', () => {
  appendAudit(db,e1); appendAudit(db,e2);
  db.prepare("UPDATE audit_log SET detail='{}' WHERE seq=1").run();
  expect(verifyAudit(db)).toMatchObject({ ok:false, brokenAt:1 });
});
```

`server/app.test.ts` (con `app.request`, Valkey sustituido por implementación en memoria de la misma interfaz):

```ts
test('sin token responde 401', ...);
test('pull de captura no trae antecedentes ni observaciones', ...);   // ambos campos === null
test('pull de clinico sí los trae', ...);
test('export.csv no contiene nombre, teléfono, correo ni curp', ...); // cabecera exacta: folio,municipio,servicio,fecha,grupoEdad
test('audit/verify con rol captura responde 403', ...);
```

- [ ] **Step 2:** `npx vitest run server`, esperado FAIL.
- [ ] **Step 3:** Implementar `server/db.ts`. Tablas: `patients`, `visits`, `applied_mutations(id PRIMARY KEY, result_json)`, `link_decisions`, `field_versions(patient_id, field, version, actor, at)`, `audit_log(seq INTEGER PRIMARY KEY, ts, actor, role, action, entity, entity_id, detail, prev_hash, hash)`. Archivo en `data/eira.sqlite`, modo WAL.
- [ ] **Step 4:** Implementar `server/audit.ts`: `hash = sha256(prev_hash + ts + actor + action + entity_id + detail)`; `prev_hash` de la primera fila es 64 ceros.
- [ ] **Step 5:** Implementar `server/apply.ts` dentro de una transacción. Regla de conflicto: un campo entra en conflicto solo si `field_versions.version > baseVersion` para ese campo y el valor difiere; si hay algún campo en conflicto, no se aplica ninguno de la mutación.
- [ ] **Step 6:** Implementar `server/valkey.ts` con interfaz `ChangeBus { publishChange(c): Promise<string>; changesSince(cursor): Promise<{ ids: string[]; cursor: string }>; indexPatient(p): Promise<void>; candidateIds(keys: string[]): Promise<string[]>; setSession(token, data, ttl); getSession(token); subscribe(fn) }`. Claves: Stream `eira:cambios` (`XADD`, `XRANGE`), Sets `eira:blk:<clave>` (`SADD`, `SUNION`), `sess:<token>` (`SET EX`), canal `eira:eventos`. Incluir `MemoryBus` con la misma interfaz para pruebas y para arrancar sin Valkey; `/api/health` informa cuál está activa.
- [ ] **Step 7:** Implementar `server/app.ts` y `server/main.ts` (sirve `dist/` como estático en producción, puerto `PORT` o 8787).
- [ ] **Step 8:** Implementar `server/seed.ts`: 40 pacientes ficticias en "Villa Ejemplo" y "San Prueba"; incluye María Ejemplo López (1984-03-12) con visita `papanicolaou` del 2026-02-10 y una homónima María Ejemplo Ruiz (1991-07-30). Comando `npm run seed`.
- [ ] **Step 9:** Correr `npx vitest run server`, esperado PASS. Commit `feat: sync server with conflict detection, audit chain and Valkey bus`.

### Task 4: Almacén local y motor de sincronización (paralelo)

**Files:**
- Create: `web/src/local/db.ts`, `web/src/local/sync.ts`, `web/src/local/api.ts`
- Test: `web/src/local/sync.test.ts` (con `fake-indexeddb`)

**Interfaces:**
- Consumes: tipos de `shared/types.ts`; rutas HTTP de la Tarea 3
- Produces:
  - `localDb` (Dexie) con tablas `patients`, `visits`, `outbox` (`Mutation & { estado: 'pendiente' | 'conflicto'; conflict?: SyncResult['conflict'] }`), `meta`
  - `enqueue(m: Omit<Mutation,'id'|'deviceId'|'createdAt'>): Promise<Mutation>`: aplica el cambio en local de forma optimista y lo agrega a `outbox`
  - `syncNow(): Promise<{ enviados: number; conflictos: number; recibidos: number }>`
  - `resolveConflict(mutationId: string, choice: 'mio' | 'suyo'): Promise<void>`
  - `useSyncStatus(): { online: boolean; pendientes: number; conflictos: number; ultimaSync: string | null; simularSinConexion: boolean; setSimular(v: boolean): void }`

- [ ] **Step 1:** Pruebas que fallan:

```ts
test('enqueue sin red guarda el cambio local y deja 1 pendiente', async () => { ... expect(await localDb.outbox.count()).toBe(1); expect((await localDb.patients.get('p1'))!.telefono).toBe('3411000009'); });
test('la cola sobrevive a reabrir la base', async () => { await enqueue(m); localDb.close(); await localDb.open(); expect(await localDb.outbox.count()).toBe(1); });
test('syncNow envía en orden de creación y vacía la cola si todo se aplica', ...);
test('un conflict deja la mutación en estado conflicto con ambos valores', ...);
test('resolveConflict("mio") reenvía con la versión del servidor; "suyo" descarta y restaura el valor del servidor', ...);
test('si push falla por red, nada se pierde y pendientes no cambia', ...);
test('duplicate se trata como enviado', ...);
```

- [ ] **Step 2:** Correr, esperado FAIL.
- [ ] **Step 3:** Implementar. Decisiones fijas: `deviceId` UUID guardado en `meta`; `syncNow` hace push y luego pull con el `cursor` guardado en `meta` y el municipio de la jornada activa; se dispara al evento `online`, cada 20 s con red y al pulsar "Sincronizar"; "simular sin conexión" hace que `api.ts` rechace toda petición.
- [ ] **Step 4:** Correr, esperado PASS. Commit `feat: local-first store and sync engine`.

### Task 5: Pantallas (paralelo; integra al final con Tareas 2 y 4)

**Files:**
- Create: `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/styles.css`, `web/src/screens/Login.tsx`, `web/src/screens/Recepcion.tsx`, `web/src/screens/Expediente.tsx`, `web/src/screens/Conflictos.tsx`, `web/src/screens/Bitacora.tsx`, `web/src/components/BarraEstado.tsx`, `web/src/components/TarjetaCoincidencia.tsx`, `web/src/components/TarjetaFolio.tsx`
- Modify: `vite.config.ts` (vite-plugin-pwa, `registerType: 'autoUpdate'`, precache del shell)
- Test: `web/src/components/TarjetaCoincidencia.test.tsx`

**Interfaces:**
- Consumes: `findCandidates` (Tarea 2); `enqueue`, `syncNow`, `resolveConflict`, `useSyncStatus`, `localDb` (Tarea 4)

- [ ] **Step 1:** Prueba que falla:

```tsx
test('la tarjeta no ofrece vincular sin elección explícita', () => {
  render(<TarjetaCoincidencia candidata={probable} onDecidir={fn} />);
  expect(screen.getByRole('button', { name: 'Sí, es ella' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'No, es otra persona' })).toBeEnabled();
  expect(fn).not.toHaveBeenCalled();
});
test('muestra las razones campo por campo', () => { ... expect(screen.getByText(/fecha de nacimiento.*difiere/i)).toBeVisible(); });
```

- [ ] **Step 2:** Implementar pantallas. Decisiones fijas:
  - **Recepción** es una sola pantalla: campos nombres, apellidos, fecha de nacimiento y folio opcional. Al escribir, lista candidatas desde `localDb` con `findCandidates`. Con folio válido abre el expediente directo.
  - **TarjetaCoincidencia**: datos lado a lado, razones con icono y texto (no solo color), botones "Sí, es ella" y "No, es otra persona". Ambos generan `link.decide`; "No" permite continuar el alta nueva y la pareja no se vuelve a sugerir.
  - **Expediente**: cabecera con folio, cronología de visitas, botón "Nueva visita", edición de contacto con historial visible ("antes: … · cambió captura1 · 10 feb"). `antecedentes` y `observaciones` solo se muestran con rol `clinico` o `admin`.
  - **BarraEstado** fija arriba, con texto completo: "Con conexión · todo guardado en el servidor" o "Sin conexión · 3 capturas guardadas en este equipo". Interruptor "Simular sin conexión" rotulado como simulación.
  - **Conflictos**: por campo, "Tu captura" frente a "Captura de captura1, 12:04", con botón para conservar cada una.
  - **Bitácora** (admin): lista de eventos y botón "Verificar integridad" que llama `/api/audit/verify`.
  - **TarjetaFolio**: folio y código QR del folio (paquete `qrcode`), imprimible, sin nombre ni dato de salud.
- [ ] **Step 3:** Correr `npx vitest run web`, esperado PASS.
- [ ] **Step 4:** Recorrido manual del caso práctico (ver Tarea 8, pasos 1 a 7) en `npm run dev`. Commit `feat: reception, record, conflicts and audit screens`.

### Task 6: Despliegue (12:30–13:30)

**Files:**
- Create: `Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example`

- [ ] **Step 1:** `Dockerfile` multi-etapa: build de `web` y arranque con `node server/main.js`. `compose.yaml` con servicios `app`, `valkey` (`valkey/valkey:8`, `--appendonly yes`, volumen) y `caddy` (puertos 80 y 443, `reverse_proxy app:8787`). Volumen para `data/`.
- [ ] **Step 2:** `docker compose up --build` en este VPS. Verificar: `curl -s localhost:8787/api/health` devuelve `{"ok":true,"valkey":true}`.
- [ ] **Step 3:** Ian levanta la misma `compose.yaml` en AWS (EC2 `t3.small` en `mx-central-1`, dominio `<ip-con-guiones>.sslip.io` en `Caddyfile` para HTTPS automático; el service worker exige HTTPS). Respaldo: la instancia de este VPS.
- [ ] **Step 4:** Verificar en la URL pública: login, alta, modo avión real del navegador, reconexión, sincronización. Commit `chore: container deploy with Valkey and HTTPS`.

### Task 7: README, licencia y texto de Devpost (13:30–14:30)

**Files:**
- Create: `README.md`, `docs/devpost.md`

- [ ] **Step 1:** `README.md` con estas secciones, en este orden: Qué resuelve (3 líneas); Cómo levantarlo (`docker compose up`, usuarios de prueba); Recorrido del caso María Ejemplo; Arquitectura (diagrama de texto y por qué local-first); Tabla Implementado / Simulado / Para piloto; Privacidad y seguridad; Operación y respaldo (quién administra, capacitación de 30 minutos, respaldo de SQLite, contingencia en papel con folio); Costos mensuales estimados; Riesgos; Preguntas abiertas para EIRA; Licencia.
- [ ] **Step 2:** La tabla debe incluir como **simulado**: autenticación (PIN, sin SSO ni segundo factor), cifrado del almacén local, datos, corte de conexión por interruptor (además del real). Como **para piloto**: análisis jurídico de datos sensibles, aviso de privacidad, cifrado en reposo, respaldo automático, pruebas con personal de EIRA.
- [ ] **Step 3:** `docs/devpost.md`: título, lema de una línea, y un párrafo por cada criterio (Usabilidad, Impacto, Escalabilidad, Privacidad y confianza, Innovación, Funcionamiento real) con una evidencia concreta en cada uno.
- [ ] **Step 4:** Commit `docs: README and submission text`.

### Task 8: Prueba de punta a punta y entrega (14:30–16:00)

- [ ] **Step 1:** Con rol `captura` y conexión: buscar "Maria Ejemplo" + 12/03/1984 → aparece María Ejemplo López como `probable` y la homónima Ruiz como `posible`.
- [ ] **Step 2:** "Sí, es ella" → abre expediente con la visita de febrero.
- [ ] **Step 3:** Activar modo avión real. La barra cambia a "Sin conexión".
- [ ] **Step 4:** Cambiar teléfono y agregar visita `ultrasonido_mama` de mayo. La barra muestra "2 capturas guardadas en este equipo".
- [ ] **Step 5:** Recargar la página sin red: la app abre y las 2 capturas siguen.
- [ ] **Step 6:** En otro navegador, con `captura` distinto y con red, cambiar el mismo teléfono.
- [ ] **Step 7:** Quitar modo avión: la visita se sincroniza, el teléfono aparece en Conflictos con ambos valores; resolver.
- [ ] **Step 8:** Con `admin`: Bitácora muestra los cambios con valor previo; "Verificar integridad" responde correcto; exportar CSV y confirmar que no trae datos personales.
- [ ] **Step 9:** Con `captura`: confirmar que no ve antecedentes ni observaciones.
- [ ] **Step 10:** 15:00 corte de funciones. Grabar video de respaldo de 90 s de los pasos 1 a 8. 15:20 enviar a Devpost con repo, URL, video y texto. 15:40 tres ensayos cronometrados del pitch.

---

# Parte B. Estrategia para ganar

## Por qué el Reto 1

- La rúbrica nombra "brigadas en campo" y "conectividad limitada" dentro de Usabilidad; el Reto 1 es el único cuyo momento central es trabajar sin internet.
- Su afirmación más difícil se puede probar en vivo en 20 segundos: modo avión, captura, reconexión, conflicto.
- Da trabajo real a Valkey (flujo de cambios, índice de coincidencias, sesiones, avisos en vivo), que es lo que mira Roberto Luna Rojas.
- Riesgo: puede ser el reto más elegido. La diferencia la ponen tres piezas con nombre: **Modo Jornada** (sin conexión real), **¿Es ella?** (coincidencia explicada campo por campo, con decisión humana registrada) y **Folio EIRA** (tarjeta con QR sin datos personales, que además es la contingencia en papel que pide la guía).

## Respuestas de EIRA que fijan el plan

Cada respuesta cambia una parte concreta; hasta tenerlas, vale el supuesto de la última columna.

| Pregunta a EIRA | Qué fija en el plan | Supuesto mientras tanto |
|---|---|---|
| Cómo reconocen a una paciente que vuelve y si saben a quién le toca repetir | Campos de `PatientQuery` y pesos de `scoreMatch` (Tarea 2); si se agrega la lista "Le toca" a Recepción (Tarea 5) | Nombre, apellidos y fecha de nacimiento; sin "Le toca" |
| Resultados anormales sin localizar y entregas a la persona equivocada | Si se cambia al Reto 4 antes de la Tarea 1 | Se mantiene el Reto 1 |
| Horas sin internet y equipo por mesa (laptop o Android) | Alcance de la Tarea 4 (cola simple o conflictos por campo) y si entra NFC en `TarjetaFolio` | Jornada completa sin red; laptops; folio con QR, sin NFC |
| Quién abre hoy los datos y qué no debe ver quien captura | Campos ocultos por rol en `pull` (Tarea 3) y en Expediente (Tarea 5) | `captura` no ve `antecedentes` ni `observaciones` |
| Volumen mensual, quién administra, presupuesto y qué los haría probarlo el lunes | Tamaño de instancia y costo del README (Tareas 6 y 7); frase de cierre del pitch | Una instancia pequeña; administra coordinación sin personal de sistemas |

Las respuestas se citan textualmente en el README ("Supuestos validados con EIRA") y una de ellas abre el pitch.

## Qué mostrar a cada juez

| Juez | Qué mira | Frase o momento del pitch |
|---|---|---|
| Martí Cristobal | Ingeniería detrás del vibecoding | "El conflicto se detecta por campo, no por registro; esta fue la decisión de diseño" |
| Roberto Luna Rojas | Valkey con trabajo real | "Cada cambio entra a un Stream de Valkey; de ahí lo leen los demás equipos" |
| Valeria Rivera Contreras | Infraestructura, seguridad, portabilidad | "Un `docker compose up`, sin servicios de pago; exporta CSV abierto" |
| Gael Hernández | Uso de Devin (inferido) | Una línea y un PR de Devin enlazado en el README |
| Ximena Cruz | Usabilidad y narrativa (inferido) | El pitch se cuenta desde la brigadista en la jornada |
| Jazmin Reyes Serrano | Sin identificar | Cumplimiento literal de los límites de EIRA |

## Pitch de 2 minutos

- 0:00–0:15 "María fue a su Papanicolaou en febrero. Volvió en mayo y la registraron de nuevo, porque hoy EIRA identifica por nombre. Esto lo evita, aun sin internet."
- 0:15–0:40 Buscar a María: aparecen ella y su homónima; la tarjeta explica por qué; una persona decide.
- 0:40–1:15 Modo avión real, cambio de teléfono y nueva visita, recarga de página, reconexión, conflicto resuelto.
- 1:15–1:35 Rol `captura` no ve datos clínicos; bitácora con verificación de integridad; exportación sin datos personales.
- 1:35–1:50 Qué es real y qué es simulado; costo mensual estimado; un comando para levantarlo.
- 1:50–2:00 "Un folio, un expediente, con o sin señal."

## Lo que hace Ian en sala (no lo pueden hacer los agentes)

1. Preguntar a mentores de EIRA las tres preguntas de la guía del Reto 1 y pedir el formato vacío de registro; citar su respuesta en el pitch.
2. Obtener el cupón de Devin y encargarle un cambio acotado (la exportación CSV o una revisión de accesibilidad) para tener un PR que mostrar.
3. Preguntar a la organización: si se puede programar durante la comida, si presentan todos los equipos o solo finalistas, si Devpost exige video, y quién es Jazmin Reyes Serrano.
4. Levantar la instancia en AWS (Tarea 6, paso 3).

## Ángulos cubiertos

Reto y caso práctico de EIRA; límites que descalifican; lectura del jurado; patrones de ganadores de las ediciones 2025 y 2026; estructura del pitch; texto de Devpost por criterio; privacidad visible; operación, costos y sostenibilidad; despliegue con respaldo; uso real de Valkey; evidencia de uso de Devin.

## Ángulos que no se cubren y por qué

- Integración entre los cuatro retos: fuera de alcance para un día; se menciona como siguiente paso.
- Cumplimiento legal detallado: el README cita la LFPDPPP de 2025 (salud es dato sensible y exige consentimiento expreso) y la NOM-024-SSA3-2012 como referencia de diseño, y lo lista como requisito de piloto; no se afirma cumplimiento. La NOM-004 y la vigencia de la NOM-014 no se verificaron en fuente primaria, así que no se citan.
- Alternativas existentes: el README menciona ODK/KoboToolbox con Entities como opción honesta de piloto y explica por qué una herramienta de un solo flujo, operable sin personal de TI, se justifica frente a OpenMRS o DHIS2.
- AWS administrado: App Runner está cerrado a clientes nuevos desde abril de 2026 y Amplify Hosting no existe en `mx-central-1`; por eso la ruta es EC2 con Compose. Para piloto se declara ElastiCache Serverless para Valkey.

## Voto en contra que debes conocer

El agente que investigó EIRA y la técnica recomienda el **Reto 4** (entrega segura de Papanicolaou), no el 1. Sus razones: flujo lineal con menos riesgo técnico, mejor encaje con "Privacidad y confianza", y usos de Valkey y AWS más naturales (código de un solo uso con TTL, token de descarga `GETDEL`, S3 con URL prefirmada de 60 s). Considera que muchos equipos elegirán el Reto 1 y fallarán en la sincronización. Este plan mantiene el Reto 1 porque esa misma dificultad es la que separa del resto si funciona en vivo, y porque las pruebas de las Tareas 3 y 4 la cubren antes de tocar la interfaz. Punto de control: si a las 12:30 la sincronización con conflicto no pasa de punta a punta, se recorta a "cola local + envío sin resolución de conflictos por campo" y se declara.
- Cifrado del almacén local y autenticación real: declarados como simulados.
- Aplicación móvil nativa y lectura de QR con cámara: el folio se teclea; EIRA usa laptops.
- Funciones con modelos de lenguaje: no aportan al flujo crítico y añaden dependencia de red y costo.

## Sin verificar

- Identidad y lente de Jazmin Reyes Serrano; perfil de Gael Hernández; cargo de Ximena Cruz.
- Si usar Devin, Valkey o AWS pesa en el puntaje (Devpost no lo dice; un listado de terceros sí, con datos contradictorios).
- Pesos de los criterios y formato exacto del pitch.
- Cuántos equipos elegirán el Reto 1.
- Disponibilidad y precios actuales de `mx-central-1`; Ian lo confirma al crear la instancia.
