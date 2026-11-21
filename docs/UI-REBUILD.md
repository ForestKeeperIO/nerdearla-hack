# Reconstrucción de la interfaz (rama `fe`)

Fecha: 2026-11-21 · Responsable: agente Devin en `fe` · Referencias de Ian: benchmark en `docs/contexto/benchmark/` (OhMD, Revelatio, Decimals y screenshots del vault).

## Dirección aplicada

- **App shell de producto** (no documento): riel lateral oficial con los informes vivos y su estado ("Paso 2/4 · Calidad", "Bloqueada"), topbar pegajosa con trigger del riel y etiqueta de entorno. Pie con disclaimer.
- **Banda de cifras** patrón OhMD (`.banda-cifras`): celdas divididas por hairline, cifra editorial + rótulo mono en versalitas. En vista previa.
- **Calidad**: cada fuente es una `Card` (header = título + estrellas, body = motivos + anomalías); los grupos de anomalías son `Accordion` del registry (abiertos por defecto si ≤6 filas).
- Toda la lógica de negocio intacta: `lib/informe.ts`, `lib/datos.ts`, `lib/catalogo.ts`, `lib/recorrido.ts`, rutas `/informe/[alcance]/{subir,calidad,vista-previa,exportar}`, `POST /api/subir` (10 MB, .xlsx/.csv), sondeo de `/api/trabajos`.

## Componentes — origen real vs. stand-in

| Pieza de UI | Fuente | Estado |
|---|---|---|
| Sidebar / app shell | Registry oficial shadcn (Base UI) `components/ui/sidebar.tsx` | REAL (registry) |
| Accordion, Card, Badge, Alert, Empty, Table, Skeleton, Tooltip, Separator, Input, Sheet | Registry oficial shadcn (Base UI) | REAL (registry) |
| StarRating, BarList, Sonner, Button | Propios previos, tokens EIRA | stand-in aceptado |
| `NavInformes` + `AppSidebar` | Propios; componen el Sidebar oficial | propio |
| stat-card 21st.dev `konsstepnov/stat-card` | PRIVADO — no lo trae ninguna key | sustituido por `.banda-cifras` (patrón OhMD) |
| bar-list 21st.dev `sltowl/bar-list` | PRIVADO | sustituido por `ui/bar-list.tsx` propio |
| Resto del benchmark 21st.dev | registry 403: key válida pero plan gratis (2/día, agotada) | pendiente post-reset |

## 21st.dev — qué pasó con la key

- `~/.config/nerdearla/21st.env` tiene `API_KEY_21ST` válida (verificada por el coordinador desde el Mac de Ian).
- **Bloqueo 1 — plan:** cuenta gratuita, 2 componentes/día ya consumidos (`retrieval_limit_reached`, reset 2026-11-22T00:00Z = después del corte de funciones 15:00 CDMX). Ian decidió **no** hacer upgrade.
- **Bloqueo 2 — privados:** `konsstepnov/stat-card` y `sltowl/bar-list` son privados; ninguna key los descarga.
- **Bloqueo 3 — Magic MCP:** el VPS recibe `error.code=challenge` (bot challenge por IP); la key no es el problema ahí.
- **Seguridad:** la CLI de shadcn imprimió la key dentro de su URL de error → quedó en logs temporales del agente (`/tmp/devin-overflows-*`, no tracked). Rotar la key cuando acabe el evento.
- **Si se usa la cuota futura:** bajar cada componente UNA vez con `curl -o archivo.json` e instalar desde el archivo. Los 2 más valiosos: un stat-card público equivalente (pieza más visible del dashboard) y un empty-state o comparison-card para la decisión "misma persona" (difícil de reproducir bien a mano). No test-fetches.

## Verificación

- `npm run build` en `web/` → compila, typecheck OK, 13 rutas generadas (ver log).
- Dev server para review: `next dev -p 3103` en este worktree.

## Pendiente honesto

- Las pantallas conservan su lógica previa; el cambio es de shell, componentes y banda de cifras. `subir`/`exportar` reciben mejoras menores de tokens, no reestructura profunda (prioridad: compilar antes del corte).
- Pantallas `/tablero` y `/calidad` legacy siguen redirigiendo a `/`.
