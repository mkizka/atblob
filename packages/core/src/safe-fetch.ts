import { safeFetchWrap } from "@atproto-labs/fetch-node";

export type SafeFetch = typeof fetch;

// Each fetch is wrapped independently (rather than mutating undici's global
// dispatcher) so that host apps embedding @atblob/hono or @atblob/express
// don't have their own unrelated fetch() calls affected.
export const createSafeFetch = (deps: {
  timeout: number;
  responseMaxSize?: number;
}): SafeFetch =>
  safeFetchWrap({
    // Resolve globalThis.fetch lazily, at call time rather than here, so
    // that fetch mocks (e.g. msw) installed after this function runs are
    // still honored.
    fetch: (input, init) => globalThis.fetch(input, init),
    timeout: deps.timeout,
    ...(deps.responseMaxSize !== undefined && {
      responseMaxSize: deps.responseMaxSize,
    }),
  });
