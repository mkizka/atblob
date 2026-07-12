---
"@atblob/core": minor
"@atblob/hono": minor
"@atblob/express": minor
---

`createAtblob` is renamed to `createRenderer` and its `Atblob` return type is renamed to `Renderer`. `createAtblobApp` (hono/express) is replaced by an `atblob` middleware factory that takes an already-created `Renderer` instance and is meant to be mounted with `app.use()`, morgan-style, instead of building a whole app from an `AtblobConfig`. This lets callers (like a CLI) also use the `Renderer` API directly, and lets them mount atblob alongside their own routes.

```ts
// Before
await using app = await createAtblobApp({ didCache: "memory" });

// After (hono)
await using renderer = await createRenderer({ didCache: "memory" });
const app = new Hono().use(atblob(renderer));

// After (express)
await using renderer = await createRenderer({ didCache: "memory" });
const app = express().use(atblob(renderer));
```
