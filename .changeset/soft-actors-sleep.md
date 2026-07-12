---
"@atblob/hono": major
"@atblob/express": major
---

`createAtblobApp` now takes an already-created `Atblob` instance instead of an `AtblobConfig` and no longer creates or disposes it. Call `createAtblob` from `@atblob/core` yourself and pass the result in, so callers (like a CLI) can also use the `Atblob` API directly instead of only through the HTTP app.

```ts
// Before
await using app = await createAtblobApp({ didCache: "memory" });

// After
await using atblob = await createAtblob({ didCache: "memory" });
const app = createAtblobApp(atblob);
```
