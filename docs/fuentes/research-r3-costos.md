# Research R3 - costos de hosting (2026-11-21). [leído] = página abierta con WebFetch; [snippet] = solo resultado de búsqueda.

1. https://aws.amazon.com/elasticache/pricing/ [leído, sin fecha, (c) 2026] - Serverless Valkey: mínimo 100 MB medidos, $0.084/GB-h (~$6/mes mínimo, FAQ dice "desde $6/mes"), $0.0023 por millón de ECPU; "33% más barato" serverless y "20% más barato" en nodos vs otros motores. Tablas de nodos no renderizaron.
2. https://aws.amazon.com/lightsail/pricing/ [leído, sin fecha] - Linux más barato: $5/mes (512 MB, 2 vCPU, 20 GB, IPv4 público); $3.50 solo IPv6; $7 con 1 GB.
3. https://aws.amazon.com/free/ [leído, sin fecha] - Plan gratuito: hasta $200 en créditos ($100 al inicio + $100 explorando), la cuenta se cierra a los 6 meses; no elegible para créditos promocionales; plan de pago da créditos hasta $200 adicionales.
4. https://aws.amazon.com/memorydb/pricing/ [leído] - Sin precio de nodo pequeño visible (solo db.r6g.xlarge $0.432/h); sin prueba gratis ni descuento específico de Valkey; snapshots gratis hasta 100%. Sin Multi-AZ no es barato: no apto.
5. https://instances.vantage.sh/aws/ec2/t4g.nano y https://calculator.holori.com/aws/ec2/t4g.small/us-east-1 [snippet] - On-demand us-east-1 Linux: nano $0.0042/h (~$3.07/mes), micro $0.0084/h (~$6.13), small $0.0168/h (~$12.26). No confirmado en página oficial AWS (solo copia Scribd de 2021).
6. https://upstash.com/blog/aws-elasticache-pricing-explained-2026-full-cost-breakdown [snippet] - cache.t4g.micro Valkey $0.0128/h (~$9.34/mes), vs $0.016 Redis OSS. Fuente de tercero (Upstash compite con ElastiCache).
7. https://aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/ [leído] - Hasta $5,000 en créditos; 1 solicitud por año fiscal (jul-jun); válidos 1 año; no cubre Reserved, Marketplace, Route 53 dominios; internacionales vía socio TechSoup en techsoup.global; la página no lista países.
8. https://aws.amazon.com/blogs/publicsector/global-expansion-of-the-aws-nonprofit-credit-program-with-techsoup [snippet] - Expansión global del programa (cifras de países contradictorias entre páginas: 50 vs 120+).
9. https://blog.techsoup.org/en-us/posts/aws-pricing-tiers-have-been-updated-to-empower-larger-organizations [snippet] - Cuota administrativa TechSoup (~$95 por $1,000 en créditos para ONG pequeñas según resumen); verificar.
10. https://aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/aws-imagine-grant-faq/ [snippet] - Imagine Grant: EE.UU. 501(c); ciclo 2026 cerró 5-jun-2026; montos oficiales no confirmados.
11. https://www2.fundsforngos.org/innovation/aws-imagine-grant-for-nonprofits-using-cloud-technology-u-s/ [snippet] - Agregador: $100k-$500k (no oficial).
12. https://aiven.io/docs/products/valkey/concepts/valkey-free-tier [leído] - Valkey gratis: 1 GB RAM, maxmemory 50%, un nodo, backups, puede apagarse por inactividad, sin SLA, Aiven puede cambiar región/config.
13. https://aiven.io/pricing/valkey [snippet] - Free $0; Hobbyist desde $19/mes.
14. https://upstash.com/pricing/redis [leído] - Gratis: 500K comandos/mes, 250 MB, 10 GB banda; pago $0.20 por 100K comandos, $0.25/GB.
15. https://railway.com/pricing [leído] - Prueba $5 único/30 días; Hobby $5/mes con $5 de uso incluido; memoria ~$10/GB-mes, CPU ~$20/vCPU-mes.
16. https://fly.io/pricing-update/ [snippet] - shared-cpu-1x 256MB $2.19/mes desde 1-oct-2026; asignación gratuita no confirmada (fuentes en conflicto).
17. https://render.com/pricing [leído, sin tablas] - Solo "sitios estáticos gratis"; límites de servicios gratuitos/Key Value no verificados.
18. https://www.cloudflare.com/galileo/ [snippet] - Project Galileo: DDHH, sociedad civil, periodismo, democracia; ingreso vía socios; protección de seguridad, no cómputo. Una ONG de salud puede no calificar. Límites de Pages/Workers no verificados.
19. https://docs.github.com/en/nonprofit/nonprofit-teams-plan [snippet] - GitHub for Nonprofits: Team gratis o 25% en Enterprise; requiere 501(c)(3) o equivalente con prueba local.
20. https://support.google.com/nonprofits/answer/3215869 y https://support.google.com/nonprofits/answer/1614581 [snippet] - Google for Nonprofits: México aparece en lista de países (tabla confusa), verificación vía Percent; excluye hospitales/organizaciones de salud (revisar si una ONG de salud califica).
21. https://valkey.io/ [leído] - BSD, respaldado por Linux Foundation; Valkey 9.2.0 publicada 2026-11-19.
22. https://redis.io/legal/licenses/ [snippet] - Redis 7.4+: RSALv2 o SSPLv1; Redis 8: AGPLv3 como tercera opción.
23. https://www.theregister.com/2025/05/01/redis_returns_to_open_source/ [snippet] - Redis 8 con AGPLv3 (mayo 2025), vuelta parcial a open source.
24. https://oneuptime.com/blog/post/2026-03-31-redis-redis-vs-valkey-understanding-the-fork/view [snippet] - 7.2.4 última BSD; Valkey nace marzo 2024 bajo LF.
25. https://www.langchain.com/blog/building-a-harness-with-jev [leído] - "Jev": modelo "System One" de TypeSafe AI que clasifica/decide con probabilidades (no genera texto); afirma 200x más rápido y 400x más barato que LLM en clasificación (cifras del proveedor); sin precios.
26. https://pypi.org/project/jevmem [snippet] - jevmem: memoria persistente para agentes en un archivo SQLite.
27. https://www.activepieces.com/blog/how-to-cut-ai-token-costs-with-jev-agent-in-2026 [snippet] - Artículo sobre recorte de costos de tokens con "Jev Agent" (el resumen lo une a Jevgrep/dzhng; poco fiable).
