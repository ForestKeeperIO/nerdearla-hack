You are Devin on GPT (best model, high effort), started by nerdearla (coordinator bot) at Ian's explicit request, to take over the frontend of the Nerdearla Vibeathon EIRA app. Repo: /home/ian/projects/nerdearla-hack (main). Frontend branch: fe, worktree /home/ian/projects/nerdearla-hack-fe, app in web/. A previous Devin session owned fe until now and has been told to commit, push and stop. BEFORE editing: `git -C /home/ian/projects/nerdearla-hack-fe status` must be clean and `git fetch && git merge origin/main` done (main 9ad2e64+ has the engine, Metabase links and SPEC). If the tree is dirty, wait 2 minutes and check again; do not overwrite someone's uncommitted work.

CLOCK: feature cut-off 15:00 CDMX today, Devpost 16:00. Work in small commits that each build from a clean export; ship what is done at 14:50.

Ian's verdict on the current Tablero (his words): "any junior dashboard looks better", "a billion websites identical to this", "AI slop, everything misaligned", usability must be "mega intuitive". Readers of the report: executives, hospitals, government.

READ FIRST (10 minutes, do not skip, do not trust summaries including this one):
- Two independent reviews with screenshots: /home/ian/projects/nerdearla-hack/docs/reviews/2026-11-21-1410-tablero-fe-a593d17.md (main) and /home/ian/projects/nerdearla-hack-fe/docs/reviews/ (2026-11-21-ui-fe.md, shots/, shots2/).
- Challenge: docs/contexto/guia-eira.md (RETO 3). EIRA's needs: docs/contexto/nota-granola-eira.md. Specs and gaps: docs/SPEC.md, docs/SPEC-GAPS.md. Ian's quoted direction: docs/UI-BRIEF.md. Visual references: docs/referencias/auditoria-componentes.md (+ capturas-details/), docs/referencias/paleta-eira.md, docs/contexto/benchmark-ui.md.

Direction fixed by Ian: top-level tabs Tablero | Informes (Informes = 4-step upload flow, in order), no sidebar; multi-select filter toolbar; bulk classify of selected rows; charts = Metabase EMBEDDED (public links from metabase/enlaces.json entornos[ENTORNO], never hardcoded, never 127.0.0.1); Global keeps the SUM across programmes, labelled honestly.

EXECUTE THE AUDIT, in this order (correctness before polish):
1. ONE NUMBER. Tablero says 139 personas, Metabase 126, engine 108 impactadas + 51 donantes. Count impacted people from eira:per:impactadas:<programa> (summed for Global) and donors from eira:per:donantes:<programa>, not eira:per:todas. Tablero, Metabase and the report must agree; prove it.
2. DASHBOARD GRID. 12 columns, container 1280-1360 wide at 1440; header, toolbar and content share one left edge; one spacing scale, one radius.
3. ANSWER FIRST. Headline KPIs (personas impactadas, edad promedio, municipios/ciudades, plus donantes as its own unit) fully above the fold at 1440x900 and at 390, each with unit, cut-off date, source and a one-sentence "Cómo se calculó".
4. TOOLBAR. One row of dropdown multi-selects (Programa, Periodo, Estado/Municipio, Tipo de servicio) with count badges; active filters as chips in a thin row; Limpiar; "Actualizado hace X" + a Refresh button; Export. Human labels only ("Tamizaje Rosa", "abr 2026"). Municipio from the engine's official municipio (no "Cd. Guzmán / Ciudad Guzmán / Zapotlán el Grande" triplicates, no seeded fake towns). People count and average age only respond to programa today (missing DB views): show which figures each active filter affects; no filter may silently do nothing.
5. MAP BY STATE (Ian's new ask): a Mexico state map (and Jalisco municipalities if data allows) showing presence/people per state. The Claude main agent is adding a state map card in Metabase: coordinate through me; if you build it natively use a light SVG choropleth with real engine data, framed as presence, never as a coverage gap (Ian 13:09).
6. CHARTS right under the KPIs, full width, not three screens down in a fixed 520px frame. Services list without zero rows, including donaciones/pelucas.
7. Warnings: slim neutral banner, one line, action on the same line.
8. Bulk classify table: verify it writes to eira:decisiones and the pending counts update.
9. DESIGN PASS, mandatory: run the Hallmark skill with a NEW direction (the Coral theme was rejected) and then impeccable / design-taste-frontend (~/.agents/skills). EIRA palette, deep tones lead, pink only as a small tint; large light-weight figures with small mono labels (OhMD reference); dense and tool-like. It must look like a specific product for EIRA, not a template.
10. Informes flow: fix whatever the reviews list as still open.

RULES: never touch soe_python or Selma's branch; never rm -rf; do not edit engine (py/), metabase/ or the sync script (ask me). Do not rebuild in place under a running server: build each commit in its own export directory and serve from there on :3103. Verify before claiming; cite commit, command output, viewport screenshots (full-page captures paint iframes blank).

Done means: report commit(s), clean-export build output tail, viewport screenshots of /tablero at 1440 and 390 (paths), the three numbers agreeing, and an explicit NOT DONE list. Send a first report by 14:35 CDMX even if partial.
