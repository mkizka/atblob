---
"@atblob/hono": minor
---

Make `hono` a peer dependency instead of a regular dependency, so consumers no longer risk ending up with two different resolved copies of `hono` (which broke type compatibility, e.g. `atblob(renderer)` failing to satisfy Hono's `MiddlewareHandler` type). Consumers must now install `hono` themselves:

```sh
pnpm add hono @atblob/hono
```
