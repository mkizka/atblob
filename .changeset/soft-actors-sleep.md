---
"@atblob/core": minor
"@atblob/hono": minor
"@atblob/express": minor
---

`createAtblob` is renamed to `createRenderer` and its `Atblob` return type is renamed to `Renderer`. `createAtblobApp` (hono/express) now takes an already-created `Renderer` instance instead of an `AtblobConfig`, and no longer creates or disposes it itself, so callers (like a CLI) can also use the `Renderer` API directly instead of only through the HTTP app.

```ts
// Before
await using app = await createAtblobApp({ didCache: "memory" });

// After
await using renderer = await createRenderer({ didCache: "memory" });
const app = createAtblobApp(renderer);
```
