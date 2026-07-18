---
"@atblob/express": minor
---

Make `express` a peer dependency instead of a regular dependency, for the same reason as `@atblob/hono`'s `hono` dependency: it avoids consumers ending up with two different resolved copies of `express`. Consumers must now install `express` themselves:

```sh
pnpm add express @atblob/express
```
