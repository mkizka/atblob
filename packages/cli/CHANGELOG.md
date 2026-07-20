# @atblob/cli

## 0.5.0

### Minor Changes

- aa82fbf: Add a `--blob-cache-max-bytes` / `BLOB_CACHE_MAX_BYTES` option to cap the in-memory blob cache size.

### Patch Changes

- Updated dependencies [9f4c4ef]
- Updated dependencies [aa82fbf]
  - @atblob/core@0.3.0
  - @atblob/hono@0.2.2

## 0.4.2

### Patch Changes

- 8ec97eb: Print a clean error message on invalid args/env instead of a stack trace.
- Updated dependencies [5999952]
- Updated dependencies [d2cd4bd]
- Updated dependencies [11b66c5]
- Updated dependencies [3e31e20]
  - @atblob/core@0.2.1
  - @atblob/hono@0.2.1

## 0.4.1

### Patch Changes

- Updated dependencies [60e8a09]
  - @atblob/hono@0.2.0

## 0.4.0

### Minor Changes

- f999027: Expose `runCli` and `Env` as a library entry point (`import { runCli } from "@atblob/cli"`), separate from the `atblob` bin script.

## 0.3.0

### Minor Changes

- 04b6677: Add a `--blob-cache-ttl` / `BLOB_CACHE_TTL` option to configure how long fetched blobs are cached in memory.

### Patch Changes

- Updated dependencies [04b6677]
  - @atblob/core@0.2.0
  - @atblob/hono@0.1.2

## 0.2.0

### Minor Changes

- acd52e7: Add an ASCII art landing page at `GET /`.

### Patch Changes

- cf73559: Improve log readability by wrapping the timestamp and level in brackets, and simplify the CLI's version label and startup log.
- Updated dependencies [cf73559]
  - @atblob/core@0.1.1
  - @atblob/hono@0.1.1

## 0.1.0

### Minor Changes

- 3454b60: Add a health check. `Renderer#checkHealth()` reports whether the configured DID cache is reachable, and the CLI exposes it at `GET /health`.
- 73fc00c: Default `didCache` to `memory` instead of requiring `redis` to be configured explicitly

### Patch Changes

- fd85a10: Default the Docker image's log format to JSON
- Updated dependencies [7604c31]
- Updated dependencies [1efdf19]
- Updated dependencies [3454b60]
- Updated dependencies [73fc00c]
  - @atblob/core@0.1.0
  - @atblob/hono@0.1.0

## 0.0.2

### Patch Changes

- @atblob/hono@0.0.2

## 0.0.1

### Patch Changes

- bf89bb1: bump version
- Updated dependencies [bf89bb1]
  - @atblob/hono@0.0.1
