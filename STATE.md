# STATE: Impacto EIRA (Nerdearla Vibeathon)

Integración (rama `integra-selma`, 14:30 CDMX): export de `soe_python@13a806d`, siete pruebas del procesador pasaron con Valkey privado. Base del frontend `6abb898`: `rolesDe` necesita dos claves del procesador. Staging sin acceso a los servicios en línea; evidencia y criterios de corte en `docs/integracion-selma.md`.

14:42 CDMX: 7 cargas listas y 7 duplicadas por API, ambas v2 agregan 8 filas; decisión de separar confirmada. Las 17 tarjetas Metabase leen el exportador. Puerta de corte roja: procesador/Metabase 245, tablero/CSV 0; Melenas de `reportes/` se lee 80 donaciones y 0 entregas. Próximo: repetir con tip nuevo de Selma y FE corregido. No activar producción.

Snapshot taken 2026-11-21 between 20:35 and 20:52 CET (13:35 to 13:52 CDMX) by a read-only worker. Hours below are CET. Paths are relative to `~/projects/` on the VPS.

Everything here was checked against the real thing in this session unless it says **UNVERIFIED**. Other agents were committing while this was written: `main` moved from `81dad45` to `526b2b2` during the snapshot. Run the commands in "How to refresh" before you rely on a row.

This file replaces `.claude/STATE.md` (not in git; it now holds only a pointer and the list of paused VPS services) and supersedes `docs/ESTADO-SESION.md`, which is a stale mirror.

## Worktrees, clones and branches

Remote: `github.com/ForestKeeperIO/nerdearla-hack`. "Merged" means the branch tip is an ancestor of `origin/main` at `526b2b2` (`git rev-list --count origin/main..origin/<branch>` = 0).

"Builds" is `npm ci && npm run build` in `web/` on a `git archive` export of the commit named, in a scratch directory. No worktree was touched and nothing was fixed. Python tests were not run.

| Path | Kind | Branch | Tip, date | Builds | Merged into main | Dirty files | Owner | Next action |
|---|---|---|---|---|---|---|---|---|
| `nerdearla-hack` | main clone | `main` | `526b2b2`, 20:50 | `81dad45` (20:32): **no**, `npm ci` fails. `c7b0551` (20:37): **yes**. `526b2b2`: **UNVERIFIED** | n/a | 0 tracked; untracked `docs/SPEC-GAPS.md` (another worker's) | Claude (main build, sync, engine) | Build the tip. Three `fe` merges landed after the last commit that was built |
| `nerdearla-hack-fe` | worktree | `fe` | `db86540`, 20:47 | `5d08cde` (20:28): **no**, type check fails. `db86540`: **UNVERIFIED** | yes | 9 | Devin | Commit or drop the 9 files. Sidebar shell conflicts with the spec (see Drift) |
| `nerdearla-hack-motor` | worktree | `motor` | `c5e5d08`, 20:41 | `ff3ab2b` (20:32): **no**, `npm ci` fails. `c5e5d08`: **UNVERIFIED** | **no**: 1 commit ahead, 19 behind | 15 | Claude (engine); a `devin -p` run is live here | Integrate `c5e5d08` (merges cleanly per `git merge-tree`); commit or drop the 15 files |
| `nerdearla-hack-fuentes-reales` | worktree | `fuentes-reales` | `6f7d490`, 19:59 | no `web/` on this branch | yes | 0 | none (done) | None. Can be removed after the event |
| `nerdearla-hack-referencias` | worktree | `referencias` | `9d922e5`, 20:16 | no `web/` on this branch | yes | 0 | none (done) | None |
| (no directory) | local + remote branch | `valkey-base` | `e9feb5e`, 19:10 | no `web/` on this branch | yes | n/a | none (done) | None |
| `nerdearla-hack-metabase` | separate clone | `metabase` | `c7b0551`, 20:37 | **yes** (`c7b0551`) | yes | 12 (dashboards, captures, `construir_demo.py`) | Metabase worker | Commit the 12 files; they are only on disk |
| `nerdearla-hack-entrega` | separate clone | `entrega` | `786d4d3`, 20:23 | **no**, type check fails | yes | 0 | none named | Rebase on main before editing README or Devpost text again |
| `nerdearla-hack-demo` | separate clone | `demo` | `8f9482f`, 20:10 | no `web/` on this branch | yes | 0 | none named | None. Its scripts are on main |
| `nerdearla-hack-e2e` | separate clone | `fe-e2e` | `9136c2f`, 20:27 | **no**, `npm ci` fails | yes | 0 | none named | None. Superseded by `c7b0551` on main |
| (remote only) | remote branch | `soe_python` | `d369e20`, 20:24 | **no**, `npm ci` fails (it is main as of 20:24) | it is an old main tip | n/a | Selma | **Hands off** (section below) |
| `nerdearla-hack-vista` | plain directory, not git | n/a | holds `app-c7b0551/`, `app-actual/`, `motor-c5e5d08/`, `motor-actual/` | n/a | n/a | n/a | Claude (main build) | The online demo is served from here. Do not delete |
| `nerdearla-hack-vista-fe`, `-vista-fe2`, `-vista-motor` | plain directories, not git | n/a | earlier exports | n/a | n/a | n/a | Claude (main build) | Nothing is served from them now except the app tunnel's working directory. Remove after the event |

Build evidence (tails of the logs):

- `main@81dad45`, `motor@ff3ab2b`, `fe-e2e@9136c2f`, `soe_python@d369e20`: `npm error ERESOLVE … peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.1.1`, with `@types/node@"^20"` in `web/package.json`.
- `fe@5d08cde`, `entrega@786d4d3`: `lib/recorrido.test.ts(1,40): error TS2307: Cannot find module 'vitest'` then `Failed to type check.`
- `c7b0551` ("fix(web): @types/node ^22 so a clean npm ci works with vitest 5"): `npm ci` 0, `npm run build` 0, route table printed.
- The sync log says `integrada fe (db86540…)` at 20:50:31, and that script only merges after its own `npm ci` and build pass. That is the script's claim, not a build run here: **UNVERIFIED**.

## Drift and unmerged work

1. `motor` has one commit not in main (`c5e5d08`, "Motor: reemision Valkey, reconstruir, restituir y pares como UNA") and 15 uncommitted files in its worktree, with a Devin run still editing there.
2. No one has built `main@526b2b2` outside the sync script. The last tip built here is `c7b0551`; `81dad45` could not even install.
3. The public app serves an export of `c7b0551`, five commits behind main, so the sidebar shell and the new landing from `fe` are not online.
4. `fe` commit `b8e9d97` ("app shell con sidebar oficial") is in main. The product spec says "No hay barra lateral ni segunda navegación" and Ian rejected the earlier sidebar. See `docs/UI-BRIEF.md`, section 2.
5. Uncommitted work exists only on disk: 12 files in the Metabase clone, 9 in `fe`, 15 in `motor`. The sync script pushes branches but no longer commits for anyone.
6. Stale leftovers: `entrega` and `fe-e2e` fail to build at their tips (both merged, 52 and 50 commits behind); `docs/ESTADO-SESION.md` and the SessionStart copy of the old state describe the 13:00 CDMX plan; the first tunnel URL is dead.

## Running now

Taken at 20:50 CET with `ps`, `/proc/<pid>/cwd`, `/proc/<pid>/environ` and `ss -ltnp`. Nothing was stopped.

### Public URLs

| URL | Status | Serves | Process |
|---|---|---|---|
| https://composition-mesh-farming-beads.trycloudflare.com | 200 at 20:50 | The app, "en blanco" environment: Next.js on `:3101`, Valkey base 4 | cloudflared pid 337506 → next-server pid 356967 |
| https://conclusions-potatoes-dealt-scanners.trycloudflare.com | `/api/health` 200 at 20:50 | Metabase on `:3200` | cloudflared pid 357285 → java pid 290824 |
| https://presence-ability-grounds-selective.trycloudflare.com | **dead** (no response) | Was the rejected first frontend on `:3100` | none |

Both are quick tunnels: the address changes if cloudflared restarts. There is no tunnel for a "con fuentes reales" environment; nothing listens on `:3100`. The Next.js servers and Metabase listen on all interfaces (`*:<port>`), not only on localhost; whether a firewall blocks them from outside is **UNVERIFIED**.

### Processes

| PID | Started | Working directory | What it does |
|---|---|---|---|
| 198793 | 17:18 | `nerdearla-hack` | Claude Code session (stream-json, under the Orca supervisor 198782): the main build, sync and engine owner |
| 223504, 223548 | 18:22 | `nerdearla-hack` | Interactive `devin` and its `acp` child |
| 346299, 346306, 352665, 354002 | 20:35 to 20:40 | `nerdearla-hack` | Four `claude` Orca worker sessions. One of them is this worker; which is which was not resolved |
| 337749, 337750, 337784 | 20:27 | `nerdearla-hack-motor` | `timeout 2700 devin -p --prompt-file …/devin3/motor3.txt`: Devin's third pass on the engine. Ends by itself at 21:12 at the latest |
| 367003, 367004, 367008 | 20:50 | `nerdearla-hack-motor` | `uv run pytest -x -q`, started by that Devin run. Short-lived |
| 226565 | 18:29 | `nerdearla-hack/.valkey/data` | `valkey-server 127.0.0.1:6379`: the app's Valkey. Bases seen in use: 0, 4, 5, 12 |
| 301917 | 20:05 | `nerdearla-hack-motor/.valkey/data` | `valkey-server 127.0.0.1:6391`: engine tests |
| 362774 | 20:47 | `.demo-eira/valkey-verif` | `valkey-server 127.0.0.1:6392`: a verification instance |
| 290824 | 19:57 | `nerdearla-hack-metabase` | `java -jar .metabase/metabase.jar`: Metabase on `*:3200` |
| 357285 | 20:43 | `nerdearla-hack-metabase` | `cloudflared tunnel --url http://127.0.0.1:3200`: the Metabase tunnel |
| 337506 | 20:27 | `nerdearla-hack-vista-fe2/web` | `cloudflared tunnel --url http://127.0.0.1:3101`: the app tunnel |
| 356967 | 20:42 | `nerdearla-hack-vista/app-c7b0551/web` | `next-server` on `*:3101`, `ENTORNO=blanco`, Valkey base 4: **the public app** |
| 366175, 366210 | 20:49 | `nerdearla-hack-vista/motor-c5e5d08` | `uv run python -m py.motor.worker`: the engine worker for the public app (Valkey base 4, SQLite at `.demo-eira/datos/demo.sqlite`) |
| 336704, 336727, 336728 | 20:26 | `nerdearla-hack-fe/web` | `next start -p 3110`, Valkey base 5: Devin's preview of `fe` |
| 362879, 362909, 362915 | 20:47 | `nerdearla-hack-fe/web` | `next start -p 3103`: a second server from the `fe` worktree |
| 361058, 361133, 361134 | 20:46 | a worker's scratchpad (`…/31bacc53…/scratchpad/co/web`) | `next start -p 3123`, `ENTORNO=demo`, Valkey base 12: another worker's check copy, with headless Chromium (Playwright) from 20:49 |

Two servers run from `nerdearla-hack-fe/web`. `next start` serves the build that was on disk when it started, and a build in that worktree rewrites `.next` under both.

### The sync loop

- Cron, not a timer: `*/2 * * * * nerdearla-hack/.claude/sync-repo.sh >> nerdearla-hack/.claude/sync-repo.log`. One entry in `crontab -l`. No related systemd timer.
- The script on disk was last changed at 20:33. It (1) pushes each clone's own branch as it is, with no automatic commits; (2) merges at most one remote branch per cycle into main, only if `git merge-tree` is clean and `npm ci` + `npm run build` (when `web/` changed) and `uv run pytest -q db scripts` (when Python changed) pass on an export; (3) skips any branch matching `^(soe_|selma)`; (4) pushes main.
- Until 20:33 an earlier version made "wip: auto-sync" commits in every clone. That is where those commits on `motor`, `referencias` and main come from.
- Last three log lines: `integrada fe` at 20:42:06, 20:46:23 and 20:50:31. No failure is recorded (`.claude/sync-verificado/` is empty).
- Remove after the event: `crontab -l | grep -v sync-repo | crontab -`.

## Selma / soe_python: hands off

Nobody on this side pushes to, merges, rebases, builds in, or deletes `soe_python` or anything Selma opens. The sync script already skips `soe_*` and `selma*`.

What the branch is, checked on GitHub (`gh api repos/ForestKeeperIO/nerdearla-hack/activity?ref=soe_python`): one event, `branch_creation by SelmaOE` at 2026-11-21 19:25:58 UTC (20:25 CET), pointing at `d369e20`. That commit was the tip of main at 20:24. She has pushed no commit of her own: every commit reachable from the branch is authored by "Ian" (100) or "Devin" (3).

Commits of ours that touched it: **none after she created it.** The branch contains our history only because it was cut from main. For the record, the last of our commits inside it are:

| Commit | Time | Subject |
|---|---|---|
| `d369e20` | 20:24:15 | Merge remote-tracking branch 'origin/metabase' |
| `57747ea` | 20:24:15 | Merge remote-tracking branch 'origin/fe-e2e' |
| `14c8380` | 20:24:15 | Merge remote-tracking branch 'origin/fe' |
| `abb5884` | 20:24:15 | Merge remote-tracking branch 'origin/entrega' |
| `8df9c43`, `d6ea2e5`, `c165a81` | 20:24:03 to 20:24:09 | wip: auto-sync |
| `786d4d3`, `897e4a3` | 20:23:20 | docs: pitch script and README second pass |
| `aefd55d` | 20:22:49 | feat(web): paleta EIRA y tipografías Rosarivo+Montserrat |

Nothing to revert. A clean `npm ci` fails at `d369e20` (the `@types/node` conflict fixed later in `c7b0551`); that is her starting point, not something to push a fix into.

What our code needs from her side is only what `docs/contrato-valkey.md` says Python writes. The two sides never call each other.

- Take jobs from the Stream `eira:trabajos` (group `procesadores`) and read the file bytes from `eira:archivo:<id>`.
- Write job status and a plain Spanish `mensaje` to `eira:trabajo:<id>`.
- Write sources (`eira:fuente:*`, `eira:fuentes`), people as one opaque identifier in the `eira:per:*` sets, counts in `eira:cnt:*`, anomalies, pending pairs in `eira:pares`, and territorial presence in `eira:presencia:*`.
- Read decisions from the Stream `eira:decisiones`.
- `PUBLISH eira:eventos` when a job ends.
- No full names, phone numbers or clear IDs in Valkey. No approximate counts.

Today that contract is met by our own engine in `py/motor/` (branch `motor`), which is what the public app runs. So nothing on main is waiting for `soe_python`. If Selma's processing replaces or joins it, it does so through the same keys, and any change to the contract is made in `docs/contrato-valkey.md` first, in its own commit.

Open point carried over from the earlier state file, **UNVERIFIED** here: her e-mail address may be in the public git history.

## Decisions in force

Folded in from `.claude/STATE.md`. These are the earlier sessions' records; the quotes from Ian that back the design ones are in `docs/UI-BRIEF.md`.

- Goal: first or second place. Reto 3 of EIRA (consolidation of impact). Devpost deadline 16:00 CDMX, feature freeze 15:00.
- Split (12:10 CDMX): Selma does the Python processing; this side does Valkey, the frontend and the dashboards, built by Devin. Integration only through Valkey.
- Ian rejected the first frontend (13:00 CDMX). Spec: `docs/superpowers/specs/2026-11-21-impacto-eira-diseno.md`. Plan: `docs/superpowers/plans/2026-11-21-demo-integrado.md` (gates G0 to G7; Metabase, Splink, pandas, Valkey, SQLite).
- Reports: one per programme plus Global. Demo programmes: Tamizaje Rosa and Melenas en Movimiento; the real-sources version adds "Datos públicos de salud (Jalisco)". Programmes come from `catalogos/iniciativas.json`, never from code.
- Global: a person in two programmes counts twice. Hair donors are not people reached.
- Colour: EIRA's palette, improved (`docs/referencias/paleta-eira.md`).
- Before any action with side effects, an agent writes two lines: "Entendí / No haré".
- The VPS has no Docker: Valkey runs from the prebuilt binary (`scripts/valkey-local.sh`). A hook limits the repo to five worktrees.
- Earlier record, **UNVERIFIED** here: a write invitation was sent to SelmaOE. (She has since created a branch, so she has write access.)

## Open with Ian

- Whether the sidebar shell on main stays, given the spec and his 12:51 CDMX message.
- The "con fuentes reales" online environment: not running.
- Carried over, **UNVERIFIED**: confirm the reference engine; EIRA's real Excel files have not arrived.

## How to refresh

```bash
cd ~/projects/nerdearla-hack && git fetch origin
git worktree list
for b in fe motor fuentes-reales referencias valkey-base entrega metabase demo fe-e2e; do
  echo "$b not-in-main=$(git rev-list --count origin/main..origin/$b)"; done
ps -eo pid,lstart,cmd | grep -E 'devin|claude|next|cloudflared|valkey-server|metabase|py.motor' | grep -v grep
ss -ltnp | grep -E 'cloudflared|next-server|java|valkey'
curl -s http://127.0.0.1:<cloudflared metrics port>/quicktunnel   # prints the tunnel hostname
tail -5 .claude/sync-repo.log
```
