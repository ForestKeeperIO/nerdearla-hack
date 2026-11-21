# Research R4 - Technical best practice and pitfalls (2026-11-21)

Legend: [F] = page fetched and read; [S] = URL returned by search, takeaway from search snippet only (not opened).

## (a) Valkey

1. [F] https://valkey.io/commands/getdel/ - `GETDEL key`, since 6.2.0, O(1); returns null (and does NOT delete) if the key is not a string. Store download tokens as plain strings.
2. [F] https://valkey.io/commands/xautoclaim/ - `XAUTOCLAIM key group consumer min-idle-time start [COUNT n] [JUSTID]`; reply has 3 elements (next cursor, claimed entries, deleted IDs; third since 7.0); start at `0-0`, cursor `0-0` = scan done, keep calling periodically; scans at most COUNT x 10 PEL entries.
3. [F] https://valkey.io/topics/streams-intro/ - `XGROUP CREATE <stream> <group> $ MKSTREAM`; on boot read own pending with ID `0` until empty, then switch to `>` with BLOCK; `XACK` after success; `XPENDING key group - + 10` gives delivery count for dead-letter threshold; `XADD key MAXLEN ~ 1000 * ...` for cheap trimming.
4. [S] https://valkey.io/commands/xreadgroup - syntax `XREADGROUP GROUP group consumer [COUNT n] [BLOCK ms] [NOACK] STREAMS key ID`.
5. [S] https://www.mankier.com/3/xack.3valkey - XACK removes messages from the group's Pending Entries List; call only after processing succeeded.
6. [S] https://www.mankier.com/3/xautoclaim.3valkey - man-page mirror of XAUTOCLAIM (same synopsis).
7. [S] https://www.mankier.com/3/xgroup.3valkey - XGROUP subcommands mirror (CREATE, CREATECONSUMER, DESTROY).
8. [S] https://redis.antirez.com/fundamental/streams-consumer-patterns.md - consumer patterns write-up by the streams author (recovery loop, claiming).
9. [S] https://www.percona.com/blog/rate-limiting-strategies-with-valkey-redis/ - INCR then EXPIRE as two calls can orphan a key with no TTL if the process dies between them; use `SET key 0 NX EX 60` then `INCR`, or a Lua script that sets EXPIRE when count == 1.
10. [S] https://valkey.io/topics/persistence/ - AOF logs every write and is replayed on restart; durability depends on fsync policy (`appendfsync everysec` default trade-off).
11. [S] https://hub.docker.com/hardened-images/catalog/dhi/valkey/guides - Docker pattern: `valkey-server --appendonly yes` with a named volume at `/data`.
12. [S] https://canonical.com/data/valkey/docs/latest/how-to/persistence/ - RDB is default; RDB+AOF and none are the other modes.
13. [S] https://valkey.io/topics/valkey-bundle/ - valkey-bundle getting-started: valkey-server with all official modules preloaded.
14. [S] https://hub.docker.com/r/valkey/valkey-bundle - official image; bundles valkey-json, valkey-bloom, valkey-search, valkey-ldap; verify with `MODULE LIST` / `INFO modules`.
15. [S] https://hub.docker.com/r/valkey/valkey-bundle/tags - tags seen: `9-alpine`, `9.0-alpine`, `8-trixie`, `unstable` (pin a version tag, not `latest`).
16. [S] https://valkey.io/topics/security/ - protected mode only answers loopback when no password and default bind; never publish 6379 to the host/Internet.
17. [S] https://valkey.io/topics/acl/ - AUTH authenticates the `default` user (set by `requirepass` or ACL).
18. [S] https://valkey.io/commands/acl-setuser - `ACL SETUSER username [rule ...]`, since 6.0.0; lets the app user be limited to a key prefix and command set.
19. [S] https://valkey.io/blog/properly-secure-your-valkey-deployment/ - "Use ACLs if your setup supports it, requirepass at minimum"; example `ACL SETUSER monitor on >pw ~* +get +mget +info +ping`.
20. [F] https://unpkg.com/iovalkey@0.3.3/README.md - iovalkey is an ioredis fork; in TS use `import { Valkey } from "iovalkey"` (default import to be deprecated); all commands pass through (`set k v EX 60 NX`, `getdel`, `xreadgroup`); README has an XREAD example but no XREADGROUP example; a subscriber connection cannot run normal commands; unfulfilled blocking commands are resent on reconnect.
21. [S] https://glide.valkey.io/migration/nodejs/ioredis/ - GLIDE is the official Valkey client (Rust core) but has no drop-in ioredis compatibility layer.
22. [S] https://glide.valkey.io/migration/nodejs/ioredis/command-comparison-ioredis-glide/ - API differs from ioredis (e.g. hash args as object, options objects instead of positional flags).
23. [F] https://glide.valkey.io/reference/client-comparisons/ - compares GLIDE with node_redis only; gives no iovalkey recommendation.
24. [S] https://glama.ai/blog/2026-01-26-redis-vs-ioredis-vs-valkey-glide - third-party benchmark: for typical web workloads differences are negligible, pick by API preference.
25. [S] https://glide.valkey.io/reference/access-control/ - ACL permissions GLIDE needs (relevant only if switching client).

## (b) OWASP

26. [S] https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html - generic identical error responses for every auth outcome; throttle attempts.
27. [S] https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html - identical response and timing whether or not the account exists; tokens single-use, CSPRNG, stored securely; do not lock the account on recovery attempts (DoS).
28. [S] https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html - OTPs: short lifetime, single use, strict attempt limits, invalidated on success, never logged or stored long-term in plaintext.
29. [S] https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/11-Testing_Multi-Factor_Authentication - test cases for OTP brute force and reuse.
30. [S] https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html - validate type by content not client MIME, size limit, generated server-side filename, store outside webroot, authenticated uploaders only.
31. [S] https://github.com/OWASP/ASVS/blob/master/5.0/en/0x20-V12-Files-Resources.md - ASVS: untrusted files stored outside web root with limited permissions.
32. [S] https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html - access-control check on every object reference; do not rely on unguessable IDs alone.
33. [F] https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html - session ID >= 128 bits CSPRNG, meaningless; cookie `__Host-` prefix + Secure + HttpOnly + SameSite=Strict/Lax, Path=/, no Domain; regenerate ID at login; idle 2-5 min (high value) or 15-30 min; absolute 4-8 h; no session IDs in localStorage; `Cache-Control: no-store`.
34. [F] https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html - never log session IDs (hash if needed), tokens, keys, health data, government IDs; log auth success/failure, access-control failures, sensitive-data access, file uploads; build in tamper detection and restrict log access.

## (c) AES-GCM in Node

35. [F] https://nodejs.org/api/crypto.html - `decipher.setAuthTag()` must be called before `decipher.final()` for GCM; `final()` throws on tamper; plaintext from `decipher.update()` is NOT authenticated until `final()` succeeds; `cipher.getAuthTag()` only after `cipher.final()`; `setAAD()` before `update()`; non-128-bit tags without `authTagLength` deprecated in v22/v20.13 and disallowed in v26.
36. [S] https://medium.com/sse-blog/abusing-insecure-defaults-89a5e13ee5d3 - GCM fails catastrophically on nonce reuse; short tag lengths accepted by default are an insecure default.
37. [S] https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81 - reference snippet: 12-byte random IV + 16-byte tag stored alongside ciphertext.
38. [S] https://www.npmjs.com/package/aes-gcm-stream - streaming GCM helper; shows the stream-then-verify problem (alternative: decrypt fully in memory for small PDFs).
39. [S] https://npmjs.com/package/@transcend-io/lazydecipheriv - exists to work around needing the tag before decrypting a stream (tag is at end of file).

## (d) QR from scanned PDFs in the browser

40. [S] https://npmjs.com/package/pdf-qr - existing pipeline: pdf.js renders pages, pre-processing, then jsQR.
41. [S] https://github.com/rexshijaku/pdfbarcodejs - same idea for barcodes (pdf.js + decoder), configurable scale/patches.
42. [S] https://www.npmjs.com/package/@openhealthnz-credentials/pdf-image-qr-scanner - pdf/image QR scanner built for health credentials (Rust/WASM decoder).
43. [S] https://GitHub.com/cozmo/jsQR - jsQR API: `jsQR(data, width, height, { inversionAttempts })`, default `attemptBoth`; pass `dontInvert` for speed on printed codes.
44. [S] https://www.github.com/danimoh/jsQR - fork README states the original jsQR "doesn't seem to be maintained much anymore".
45. [S] https://www.Github.com/Sec-ant/barcode-detector - BarcodeDetector ponyfill on zxing-wasm; fetches a .wasm at runtime (self-host it, do not depend on a CDN during the demo).
46. [S] https://www.dynamsoft.com/codepool/qr-code-reading-benchmark-and-comparison.html - vendor benchmark of 7 QR libraries on 536 real images (vendor-biased; open-source decoders miss many hard images).
47. [S] https://www.dynamsoft.com/codepool/benchmark-barcode-reading-javascript-zxing-wasm-dynamsoft-barcode-reader.html - vendor benchmark: zxing-wasm 70.84% recall on 7,894 images; rasterization/decode step matters as much as the decoder.
48. [S] https://anara.com/lector/docs/installation - Vite worker setup: import `pdfjs-dist/build/pdf.worker.min.mjs?url` and assign to `GlobalWorkerOptions.workerSrc` before loading any document.
49. [S] https://github.com/wojtekmaj/react-pdf/issues/1699 - worker version must match pdfjs-dist version; alternative `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`.
50. [S] https://www.github.com/mozilla/pdf.js/issues/10478 - pdf.js "fake worker" / worker path failures under bundlers.

## (e) Web NFC

51. [F] https://developer.chrome.com/docs/capabilities/nfc - Chrome 89+ on Android only; HTTPS + top-level frame; `scan()` needs a user gesture and prompts for permission; page must be visible, screen on and unlocked; NDEF only (no ISO-DEP, NFC-A/B/F, HCE); text record: `new TextDecoder(record.encoding).decode(record.data)`; `serialNumber` may be empty; `makeReadOnly()` (Chrome 100+) is irreversible; `'NDEFReader' in window` does not prove hardware.
52. [S] https://developer.mozilla.org/docs/Web/API/NDEFReader - experimental, not Baseline, secure context only.
53. [S] https://web.dev/nfc - same guidance, mirror of the Chrome article.
54. [S] https://www.chromium.org/developers/design-documents/web-nfc/ - Chromium design doc: Android is the only shipped platform.

## (f) S3 presigned URLs, SES, SMS

55. [F] https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/overview.html - the signature is the only secret (bearer); validity is a time window (`X-Amz-Expires`), not a use count; 60 s is practical; no per-URL single-use or revocation primitive described.
56. [S] https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/logging-interactions.html - signatures travel in the query string and land in logs; expiry is the mitigation.
57. [S] https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/introduction.html - guardrails and monitoring for presigned URLs.
58. [S] https://aws.amazon.com/blogs/compute/securing-amazon-s3-presigned-urls-for-serverless-applications - presigned URLs do not authenticate the user; valid for the whole configured period.
59. [S] https://labs.withsecure.com/publications/pre-signed-at-your-service - revoking means revoking the signing role's sessions, which hits every workload on that role.
60. [F] https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html - SES sandbox: send only TO verified addresses/domains, 200 messages/24 h, 1 msg/s, per Region; production access review: initial response within 96 hours.
61. [S] https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html - how to verify identities (needed for every demo recipient while in sandbox).
62. [F] https://docs.aws.amazon.com/sms-voice/latest/userguide/phone-numbers-sms-by-country.html - Mexico (MX, +52): short codes Yes, long codes No, sender IDs Yes (no registration note), two-way Yes, international sending Yes.
63. [S] https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html - SNS SMS sandbox: can only send to verified destination numbers.
64. [S] https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox-verifying-phone-numbers.html - verifying sandbox numbers (search summary: up to 10 per Region, code requests capped at 5 per 24 h).
65. [S] https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox-moving-to-production.html - exiting the SMS sandbox requires a support/quota request.
66. [S] https://docs.aws.amazon.com/sms-voice/latest/userguide/sender-id.html - sender ID format: 3-11 chars, alphanumeric, at least one letter.
67. [S] https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-sns-supports-sending-sms-mexico-central-region - SNS SMS available from the Mexico (Central) Region.

## (g) Hash-chained audit logs

68. [S] https://dev.to/elwin_ernst/building-a-tamper-evident-audit-log-in-nestjs-with-hash-chains-4l76 - Node implementation: entry hash = SHA-256(prev_hash + canonical event JSON), fixed genesis value.
69. [S] https://dev.to/robertatkinson3570/the-architecture-behind-tamper-proof-audit-logs-56ek - a chain alone does not stop a full rewrite by someone with DB write access; anchor the head hash externally.
70. [S] https://yuch85.github.io/security-for-legal-saas/lessons/episode-42-hashchained-immutable-logs.html - enforce append-only at app and storage layer; periodic checkpoints.
71. [S] https://cran.r-project.org/web/packages/regulog/vignettes/hash-chain.html - verification walks from genesis; break appears at the modified row and every row after it.
72. [S] https://github.com/Ayush-e4/cryptlog - reference library of the same pattern.

## (h) Hono + better-sqlite3 in Docker

73. [F] https://github.com/WiseLibs/better-sqlite3/releases - latest v13.2.0 (14 Nov); v13 moved to N-API so prebuilds work across Node versions; musl and Alpine arm64 prebuilds are built; falls back to compiling if no prebuild matches.
74. [S] https://github.com/WiseLibs/better-sqlite3/issues/1382 - on musl arm64 with no prebuild, install falls back to node-gyp and fails without python/make/g++.
75. [S] https://forum.strapi.io/t/error-relocating-better-sqlite3-node-fcntl64-symbol-not-found-when-building-docker-image/24782 - `fcntl64: symbol not found` = glibc-built binary copied into an Alpine image (never copy host node_modules into the image).
76. [F] https://unpkg.com/@hono/node-server@2.0.12/README.md - `import { getConnInfo } from '@hono/node-server/conninfo'` returns the socket address (`info.remote.address`), i.e. Caddy's IP behind a proxy; README does not document X-Forwarded-For handling; Node > 20.
77. [S] https://hono.dev/middleware/builtin/secure-headers - `secureHeaders()` Helmet-like defaults; order matters with other header-setting middleware.
78. [S] https://github.com/honojs/hono/security/advisories/GHSA-92vj-g62v-jqhh - advisory: `bodyLimit()` bypass with chunked / unknown-length requests; use a patched Hono and also cap size at Caddy.
79. [S] https://osv.dev/GHSA-9vqf-7f2p-gf9v - second Hono advisory on body-limit bypass with conflicting headers.
80. [S] https://hono.dev/helpers/streaming - streaming helper; errors thrown inside the stream callback do not reach `app.onError`.

## Not verified
- iovalkey current version and exact Node 22 support statement (README gives neither).
- Whether Hono's node `getConnInfo` honours X-Forwarded-For (README silent; assume it does not).
- Which fixed Hono versions close the two bodyLimit advisories (advisory pages not opened).
- jsQR behaviour on small QR codes inside full-page scans: no measured source found; needs a test with real scans.
- Mexico-specific SMS rules beyond the AWS country table (carrier filtering, sender ID overwrite, pricing) and the default SNS SMS spend cap.
- AWS statement that one presigned URL can be replayed many times until expiry: implied by the time-window model, not quoted verbatim from a page I opened.
- valkey-bundle current module versions and whether a Valkey 9 tag is what `latest` points to.
- Year of better-sqlite3 v13.2.0 release date (page shows "14 Nov" only).
