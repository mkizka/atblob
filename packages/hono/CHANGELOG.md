# @atblob/hono

## 0.1.1

### Patch Changes

- Updated dependencies [cf73559]
  - @atblob/core@0.1.1

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

### Patch Changes

- Updated dependencies [7604c31]
- Updated dependencies [1efdf19]
- Updated dependencies [3454b60]
- Updated dependencies [73fc00c]
  - @atblob/core@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [fbf2cd6]
  - @atblob/core@0.0.2

## 0.0.1

### Patch Changes

- bf89bb1: bump version
- Updated dependencies [bf89bb1]
  - @atblob/core@0.0.1
