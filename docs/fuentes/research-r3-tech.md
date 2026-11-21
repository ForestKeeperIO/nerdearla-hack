# Research R3: Valkey analytics, modules, Node clients, import, privacy, NFC, prior art

Date: 2026-11-21. Tools: WebSearch + WebFetch. "[leído]" = page fetched and read with WebFetch; "[snippet]" = only the search-result summary was seen.

## Key verified facts (summary)

- Latest Valkey: 9.2.0 (2026-11-19). Supported lines: 9.2.0, 9.1.4, 9.0.8, 8.1.12, 8.0.13, 7.2.16 (valkey.io/download).
- Prebuilt binaries: https://download.valkey.io/releases/valkey-9.2.0-noble-x86_64.tar.gz (also -noble-arm64, -jammy-x86_64, -jammy-arm64), each with a `.sha256`.
- Ubuntu apt: noble (24.04) has 7.2.14 in universe; resolute (26.04) has 9.0.6 in main. Binary packages: valkey-server, valkey-tools, valkey-sentinel. valkey.io docs still say `sudo apt install valkey` (+ optional valkey-redis-compat).
- valkey-bundle: Docker `valkey/valkey-bundle`; tags `latest`/`9.2.0`/`9.2.0-alpine`/`9.2.0-trixie` updated 2026-11-19; `unstable` updated 2026-11-21. Modules json, bf (bloom), search, ldap are preloaded (docs show INFO modules output). Module versions inside the 9.2.0 tag NOT verified.
- valkey-search: FT.AGGREGATE since module 1.1.0; full-text + aggregations (GROUPBY/REDUCE COUNT,SUM,AVG/APPLY/FILTER/SORTBY/LIMIT) announced 1.2.0 (2026-03-17), needs Valkey >= 9.0.1; 1.3.0 GA 2026-11-18, needs Valkey >= 9.1.0 (adds COUNT_DISTINCTISH, QUANTILE, TOLIST reducers, BM25, FT.HYBRID). Supports tag, numeric range, full-text and vector queries, combinable.
- valkey-bloom: default error rate 0.01 (1%), default capacity 100, scaling x2; BF.RESERVE/BF.ADD/BF.EXISTS/BF.MADD/BF.MEXISTS/BF.CARD/BF.INFO/BF.INSERT; compatible with Valkey >= 8.0.
- HyperLogLog: "approximated with a standard error of 0.81%", up to 12 KB, PFCOUNT since 2.8.9, cannot list members.
- SINTERCARD numkeys key [key ...] [LIMIT n], since 7.0.0. Functions (FUNCTION LOAD/FCALL) since 7.0, atomic, persisted in AOF and replicated.
- Node: iovalkey 0.4.0 (Node >= 18.12, fork of ioredis, Valkey >= 7.0); @valkey/valkey-glide 2.6.0 (Node >= 20, native platform packages linux gnu/musl x64/arm64, darwin). GLIDE Batch (2.0+) has sintercard, sunionstore, pfadd, xadd, hincrBy, zincrby, setbit, bitcount, bitop, plus customCommand.
- SheetJS current 0.20.3 from CDN: `npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`; npm registry `xlsx` stuck at 0.18.5.
- Web NFC: Chrome for Android only (launched Chrome 89; makeReadOnly Chrome 100+), HTTPS, top-level frame, user gesture, "nfc" permission; NDEF only; no iOS Safari, no Firefox, no desktop.
- NTAG213/215/216 user memory: 144 / 504 / 888 bytes.

## Source list

1. https://valkey.io/commands/pfcount/ — HLL standard error 0.81%; PFCOUNT since 2.8.9; O(1) single key. [leído]
2. https://valkey.io/topics/hyperloglogs/ — HLL uses up to 12 KB, 0.81% std error, stores no elements (cannot audit/list members). [leído]
3. https://valkey.io/commands/sintercard — SINTERCARD returns intersection size, LIMIT option, since 7.0.0, O(N*M). [snippet]
4. https://valkey.io/commands/sdiff/ — SDIFF key [key ...], O(N) total elements; SDIFFSTORE exists. [leído]
5. https://valkey.io/commands/zincrby/ — ZINCRBY key increment member, since 1.2.0; ZRANGE ... WITHSCORES for rankings. [leído]
6. https://valkey.io/topics/bitmaps/ — SETBIT/GETBIT O(1), BITCOUNT, BITOP AND/OR/XOR/NOT O(n); needs dense integer IDs; 2^32 bits max per string. [leído]
7. https://valkey.io/topics/streams-intro/ — XADD O(1) append-only with time IDs, XRANGE/XLEN, consumer groups (XGROUP/XREADGROUP/XACK); avoid MAXLEN/XDEL on an audit stream. [leído]
8. https://valkey.io/topics/notifications/ — keyspace notifications need notify-keyspace-events (e.g. KEA); fire-and-forget Pub/Sub, lost if client disconnected. [leído]
9. https://valkey.io/topics/functions-intro/ — FUNCTION LOAD + FCALL (since 7.0), atomic execution, persisted via AOF and replicated, Lua 5.1. [leído]
10. https://valkey.io/topics/transactions/ — MULTI/EXEC isolated, no rollback; WATCH optimistic locking; EXEC can take conditions (IFEQ/IFNE/NX/XX). [leído]
11. https://valkey.io/topics/persistence/ — RDB snapshots vs AOF; appendfsync everysec default (~1 s loss); recommend RDB+AOF for durability. [leído]
12. https://valkey.io/topics/valkey-bundle/ — image valkey/valkey-bundle, modules json/bf/search/ldap preloaded, run command, `MODULE LIST`/`INFO modules` to verify. [leído]
13. https://hub.docker.com/v2/repositories/valkey/valkey-bundle/tags?page_size=25 — tags latest, 9.2.0, 9.2.0-alpine, 9.2.0-trixie, 8.1.12, unstable; updated 2026-11-19/21. [leído]
14. https://hub.docker.com/r/valkey/valkey-bundle — official bundle image description (JSON, Bloom, Search, LDAP). [snippet]
15. https://valkey.io/blog/valkey-search-1_2/ — 1.2 adds full-text, tag, numeric range, FT.AGGREGATE with GROUPBY/REDUCE/APPLY/FILTER/SORTBY; Docker needed :unstable as of March 2026. [leído]
16. https://github.com/valkey-io/valkey-search/releases — 1.3.0 GA (Nov 18, 2026, needs Valkey >= 9.1.0); 1.2.x/1.1 need >= 9.0.1; new reducers COUNT_DISTINCTISH, QUANTILE. [leído]
17. https://valkey.io/commands/ft.aggregate/ — FT.AGGREGATE available since module 1.1.0, same query syntax as FT.SEARCH. [snippet]
18. https://valkey.io/topics/search/ — Valkey Search overview: full-text, tag, numeric, vector queries combinable. [snippet]
19. https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html — ElastiCache Valkey 9.0+ supports numeric, tag, full-text, vector and aggregations; query term limits. [snippet]
20. https://valkey.io/topics/bloomfilters/ — valkey-bloom default FP 1%, capacity 100, scaling x2, NONSCALING option; Valkey >= 8.0. [leído]
21. https://valkey.io/download/ — latest 9.2.0 (2026-11-19); prebuilt tarballs at download.valkey.io for jammy/noble x86_64/arm64 with .sha256. [leído]
22. https://valkey.io/topics/installation/ — `sudo apt install valkey` (+valkey-redis-compat); source build `make install` to /usr/local/bin; no Windows. [leído]
23. https://launchpad.net/ubuntu/+source/valkey — noble 7.2.14 (universe), resolute 9.0.6 (main); packages valkey-server, valkey-tools, valkey-sentinel. [leído]
24. https://ubuntu.com/blog/valkey-ubuntu — Canonical announcement of Valkey packaging in Ubuntu. [snippet]
25. https://valkey.io/blog/ — recent posts: Valkey 9.2 (forkless snapshots, compressed replication, ACL roles), 9.0 hash field expiration, numbered DBs in cluster. [leído]
26. https://github.com/valkey-io/iovalkey — ioredis friendly fork; pipeline()/multi(); pitfalls: subscriber connection can't run other commands, maxRetriesPerRequest, cluster pipelines same node. [leído]
27. https://unpkg.com/iovalkey/package.json — iovalkey 0.4.0, Node >= 18.12.0. [leído]
28. https://unpkg.com/@valkey/valkey-glide/package.json — @valkey/valkey-glide 2.6.0, Node >= 20, native optional deps per platform (gnu/musl, x64/arm64, darwin). [leído]
29. https://glide.valkey.io/languages/nodejs/api/classes/Batch.Batch.html — GLIDE Batch has sintercard, sunionstore, pfadd, xadd, hincrBy, zincrby, setbit, bitcount, bitop, customCommand. [leído]
30. https://glide.valkey.io/concepts/client-features/batch-commands/ — Batch(true)=transaction, Batch(false)=pipeline; replaces Transaction API in GLIDE 2.0. [snippet]
31. https://github.com/mat-sz/node-valkey — npm package `valkey` is an unofficial, unaffiliated client (install pitfall). [snippet]
32. https://docs.sheetjs.com/docs/getting-started/installation/nodejs — SheetJS 0.20.3 from cdn.sheetjs.com tarball; npm registry stale at 0.18.5. [leído]
33. https://cdn.sheetjs.com/xlsx — SheetJS migration page: install from CDN tarball, vendoring recommended. [snippet]
34. https://github.com/SheetJS/sheetjs/issues/2822 — community thread on npm package no longer updated; third-party fork @e965/xlsx (not official). [snippet]
35. https://docs.sheetjs.com/docs/csf/features/dates — dates stored as serial numbers unless cellDates:true; 1900 vs 1904 (WBProps.date1904); 1900 leap bug; UTC option. [leído]
36. https://www.papaparse.com/docs — `encoding` option for local files (FileReader labels, e.g. "ISO-8859-1"); header, transformHeader, skipEmptyLines:'greedy', dynamicTyping, worker. [leído]
37. https://dev.to/camillehdl/utf-8-csv-fix-for-excel-3m2h — Excel only reliably reads UTF-8 CSV with BOM; otherwise assumes Windows-1252. [snippet]
38. https://www.gov.uk/government/publications/joined-up-data-in-government-the-future-of-data-linking-methods/linking-with-anonymised-data-how-not-to-make-a-hash-of-it — plain hashes of names/DOB are dictionary-attackable; HMAC with secret key helps but frequency attacks remain. [snippet]
39. https://arxiv.org/pdf/1802.07975 — ABS: direct hashing/HMAC of identifiers susceptible to frequency attack; exact-match only. [snippet]
40. https://www.publichealthlawcenter.org/resources/small-numbers-policies-and-data-suppression-what-health-department-attorneys-need-know — small-numbers / cell suppression policies in health departments. [snippet]
41. https://DOH.WA.gov/sites/default/files/legacy/Documents/1500/SmallNumbers.pdf — suppress derived rates and apply secondary suppression so cells can't be recovered by subtraction. [snippet]
42. https://kb.data.chhs.ca.gov/ddg/appendix/20.-appendix-h-survey-and-suppression-rules — California uses <11 with complementary suppression (thresholds vary: 5, 10, 11). [snippet]
43. https://developer.chrome.com/docs/capabilities/nfc — Web NFC Chrome 89 Android, HTTPS, user gesture, "nfc" permission, NDEF only, makeReadOnly (Chrome 100+, irreversible), serialNumber exposed. [leído]
44. https://caniuse.com/webnfc — supported only in Chrome for Android (and Baidu); not iOS Safari, Firefox, desktop. [leído]
45. https://www.chromium.org/developers/design-documents/web-nfc/ — Chromium design doc: Android-only implementation. [snippet]
46. https://nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf — NTAG213/215/216 user memory 144/504/888 bytes, 7-byte UID, ECC originality signature. [snippet]
47. https://www.trellix.com/blogs/research/the-cloning-of-the-ring-who-can-unlock-your-door/ — NTAG216 UID readable without auth and clonable onto "magic" cards; UID is not an authenticator. [snippet]
48. https://gototags.com/?p=3407 — some chips have rewritable UIDs, so tags can be cloned; verify originality signature. [snippet]
49. https://pubmed.ncbi.nlm.nih.gov/25745127/ — Simprints biometric identification of beneficiaries (peer-reviewed, 2015). [snippet]
50. https://www.simprints.com/identity-the-missing-link-to-universal-health-coverage/ — Simprints: offline biometric ID linked to random GUIDs rather than names. [snippet]
51. https://clinicaltrials.gov/study/NCT02518178 — Khushi Baby NFC pendant vaccination record trial (India); null result on DTP3 timeliness. [snippet]
52. https://psc.isr.umich.edu/news/next-generation-vaccine-cards-new-technology-for-improved-equity-in-east-africa/ — digital vaccine cards Kenya/Uganda; paper card retention is weak. [snippet]
53. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5005258/ — QR code identity tag system for healthcare (Turkey). [snippet]
54. https://forum.dimagi.com/t/approaches-for-generating-patient-identifiers/666 — CommCare community thread on generating patient identifiers. [snippet]
55. https://openrefine.org/docs/technical-reference/clustering-in-depth — OpenRefine key-collision (fingerprint default) and nearest-neighbor (Levenshtein/PPM) clustering. [snippet]
56. https://docs.dhis2.org/cs/implement/database-design/tracker-system-design/defining-the-tracked-entity.html — DHIS2 tracked entity unique identifier design; many contexts lack a national ID. [snippet]
57. https://docs.dhis2.org/en/implement/database-design/tracker-system-design/tracker-analytics.html — DHIS2 program indicators aggregate individual tracker data to dashboards. [snippet]
58. https://support.kobotoolbox.org/export_download.html — Kobo exports XLS (repeat groups as sheets) vs CSV (no repeats, ";" separator). [snippet]
59. https://github.com/evidence-dev/evidence — Evidence: BI as code, SQL in markdown, DuckDB. [snippet]
60. https://github.com/simonw/datasette/ — Datasette: explore/publish SQLite with JSON API. [snippet]
61. https://www.metabase.com/ — Metabase open-source (AGPL) self-hosted BI. [snippet]
62. https://www.netsuite.com/blog/and-the-hackathon-4good-winners-are — Hackathon 4Good winners: nonprofit intake to DB + admin dashboard. [snippet]
63. https://cdss.berkeley.edu/project/ngo-insights-dashboard — NGO insights dashboard project; nonprofit data siloed across collection points. [snippet]

Total: 63 distinct URLs (29 leído, 34 snippet).

## Not verified

- Exact module versions shipped inside valkey/valkey-bundle:9.2.0 (whether it includes valkey-search 1.3.0 / FT.AGGREGATE). Check at runtime with `MODULE LIST` and `FT._LIST` / a test FT.AGGREGATE.
- Whether apt packages ship any modules (assume not); how to load bloom/search .so without Docker.
- ZRANGE REV option page not read (ZREVRANGE is the safe fallback).
- @valkey/valkey-glide npm page returned 403; version taken from unpkg (2.6.0).
- iovalkey last commit date / maintenance cadence.
- OpenSRP card printing specifics; NFC in OpenSRP/CommCare.
- Specific winning hackathon projects identical to this use case.
