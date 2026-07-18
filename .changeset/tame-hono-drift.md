---
"@atblob/hono": minor
"@atblob/express": minor
---

Make `hono` and `express` peer dependencies instead of regular dependencies, so consumers no longer risk ending up with two different resolved copies (which broke type compatibility, e.g. `atblob(renderer)` failing to satisfy Hono's `MiddlewareHandler` type). Consumers must now install `hono` (for `@atblob/hono`) or `express` (for `@atblob/express`) themselves:

```sh
# @atblob/hono consumers
pnpm add hono @atblob/hono

# @atblob/express consumers
pnpm add express @atblob/express
```
