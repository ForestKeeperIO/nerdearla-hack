# Research R3 - open source (2026-11-21). [leído]=pagina abierta con WebFetch; [snippet]=solo resultado de busqueda
1. https://github.com/UgnisSoftware/react-spreadsheet-import [leído] MIT, ~559 estrellas, npm i react-spreadsheet-import, XLSX/CSV via SheetJS, autoMapHeaders + autoMapDistance=2 + alternateMatches, Chakra UI, prop translations. Sin releases visibles en la pagina.
2. https://github.com/tableflowhq/csv-import [leído] MIT, ~1.8k estrellas, npm install csv-import-react, CSV/TSV/XLS/XLSX, mapeo de columnas a esquema. Sin fecha de ultimo commit visible.
3. https://www.npmjs.com/package/react-csv-importer [snippet] auto-mapeo por nombre; Socket lo marca con cadencia de releases baja (probable abandonado).
4. https://github.com/AhmadNadeemS/react-csv-mapper [snippet] proyecto nuevo, mantenimiento sin verificar.
5. https://dev.to/gthorr/how-to-add-csv-upload-functionality-to-your-react-saas-app-in-2026-1jk4 [snippet] articulo de vendor (ImportKit); no fiable.
6. https://github.com/Yomguithereal/talisman [leído] MIT, ~733 estrellas, npm install talisman, levenshtein/jaccard confirmados; jaro-winkler y fonetica NO confirmados; tiene clustering.
7. https://www.npmjs.com/package/fuse.js [snippet] Apache-2.0 segun npm-compare; busqueda difusa, no de similitud par a par.
8. https://deno.land/x/fastest_levenshtein [snippet] MIT.
9. https://npm-compare.com/fuse.js,natural,string-natural-compare,string-similarity [snippet] string-similarity ISC (Dice/ Jaro-Winkler segun la tabla), natural MIT. Licencias no verificadas en repo.
10. https://benzsevern.github.io/goldenmatch/typescript [snippet] port TS que dice Fellegi-Sunter + EM estilo Splink; licencia y madurez sin verificar.
11. https://www.pkgstats.com/pkg:have-we-met [snippet] dedupe/merge en Node; sin verificar.
12. https://docsearch.algolia.com/mcp/docs/repo/nol13/fuzzball.js [snippet] port de TheFuzz/RapidFuzz en JS.
13. https://moj-analytical-services.github.io/splink/demos/tutorials/04_Estimating_model_parameters.html [snippet] Splink: pesos m/u de Fellegi-Sunter, pesos parciales por comparacion sumados; waterfall de explicabilidad. Imitar el concepto (tiers por peso).
14. https://moj-analytical-services.github.io/splink/settings_dict_guide.html [snippet] term-frequency adjustment; blocking rules.
15. https://www.github.com/frictionlessdata/frictionless-js [snippet] solo lectura de archivos; no valida.
16. https://npmjs.com/package/tableschema [snippet] Table Schema JS; validate() solo valida el descriptor, no los datos.
17. https://github.com/bartoszgolebiowski/zod-csv [snippet] validacion CSV con zod, errores de cabecera y fila por separado; licencia no verificada.
18. https://www.npmjs.com/package/csv-file-validator [snippet] validador con opciones de Papaparse.
19. https://docs.sheetjs.com/docs/miscellany/license [snippet] SheetJS CE Apache-2.0. Aviso: el paquete npm "xlsx" quedo en 0.18.5 con CVEs; instalar desde cdn.sheetjs.com (no verificado aqui).
20. https://toladata-ce.github.io [snippet] TolaData CE, M&E de codigo abierto; repo y licencia no vistos.
21. https://github.com/edc-it/MEInsight [snippet] AGPL v3 -> solo imitar.
22. https://awesome.ecosyste.ms/projects/github.com%2Fhikaya-io%2Factivity [snippet] Hikaya Activity (Django), ~80 estrellas, licencia sin confirmar.
23. https://docs.dhis2.org/en/implement/database-design/aggregate-system-design/indicators.html [snippet, version en otros idiomas] Indicador = numerador/denominador * factor; solo-numerador = denominador 1. Modelo a copiar.
24. https://digitalpublicgoods.net/r/kobotoolbox [snippet] Kobo BSD-2-Clause segun IADB (https://knowledge.iadb.org/en/code-development/open-source-solutions/kobotoolbox).
25. https://openhub.net/p/activityinfo [snippet] ActivityInfo GPL-3 -> solo imitar.
26. https://digitalpublicgoods.net/registry/primero.html [snippet] Primero: gestion de casos; licencia no confirmada.
27. https://tanstack.com/charts/latest/docs/comparison [snippet] Recharts, visx, Nivo todos MIT; Recharts el mas simple para dashboards.
28. https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026 [snippet] comparativa de terceros.
29. https://www.svix.com/resources/redis/counting-unique-visitors/ [snippet] SET (SCARD exacto) vs HyperLogLog (12 KB, 0.81% error); SADD devuelve si fue nuevo. Para personas unicas con certeza usar Sets, no HLL.
30. https://redis.io/tutorials/data-deduplication-with-redis/ [snippet] SET NX / SADD / SISMEMBER para dedupe exacto.
31. https://redis.io/docs/latest/develop/data-types/streams/idempotency/ [snippet] idempotencia nativa en Streams es de Redis 8.6; no encontrada para Valkey.
32. https://www.percona.com/blog/valkey-redis-sets-and-sorted-sets/ [snippet] Sets y Sorted Sets en Valkey.
33. https://valkey.io/topics/sorted-sets/ [snippet] ZADD actualiza el score si el miembro existe; no es chequeo de duplicado.
34. https://oneuptime.com/blog/post/2026-03-31-redis-deduplication-filter/markdown [snippet] blog de filtros de dedupe.
