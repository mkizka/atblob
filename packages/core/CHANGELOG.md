# @atblob/core

## 0.2.1

### Patch Changes

- 5999952: Fix blobFetchTimeout not being enforced while reading the blob response body.
- d2cd4bd: Migrate DID resolution from @atproto/identity to @atproto-labs/did-resolver.
- 11b66c5: Remove unused undici dependency from core.
- 3e31e20: Scope SSRF protection to individual fetch calls instead of the global dispatcher.

## 0.2.0

### Minor Changes

- 04b6677: Cache fetched blobs in memory for a configurable TTL to avoid re-fetching the same blob from the PDS.

## 0.1.1

### Patch Changes

- cf73559: Improve log readability by wrapping the timestamp and level in brackets, and simplify the CLI's version label and startup log.

## 0.1.0

### Minor Changes

- 7604c31: `createAtblob` is renamed to `createRenderer` and its `Atblob` return type is renamed to `Renderer`. `createAtblobApp` (hono/express) is replaced by an `atblob` middleware factory that takes an already-created `Renderer` instance and is meant to be mounted with `app.use()`, morgan-style, instead of building a whole app from an `AtblobConfig`. This lets callers (like a CLI) also use the `Renderer` API directly, and lets them mount atblob alongside their own routes.

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

- 1efdf19: Move response header construction out of `render()` and into each framework's middleware.
- 3454b60: Add a health check. `Renderer#checkHealth()` reports whether the configured DID cache is reachable, and the CLI exposes it at `GET /health`.
- 73fc00c: Default `didCache` to `memory` instead of requiring `redis` to be configured explicitly

## 0.0.2

### Patch Changes

- fbf2cd6: bump version

## 0.0.1

### Patch Changes

- bf89bb1: bump version
