---
"@atblob/core": minor
"@atblob/hono": minor
"@atblob/express": minor
---

Add a health check. `Atblob#checkHealth()` reports whether the configured DID cache is reachable (the redis-backed cache pings redis; the in-memory cache always reports healthy), and `@atblob/hono`/`@atblob/express` expose it at `GET /img/health`, returning `{ version, status, checks }` with 200 when healthy or 503 otherwise. The CLI picks this up automatically through `@atblob/hono`.
