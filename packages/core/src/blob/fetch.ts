import { safeFetchWrap } from "@atproto-labs/fetch-node";

export type BlobFetch = typeof fetch;

// Wrapped independently so that host apps embedding @atblob/hono or
// @atblob/express don't have their own unrelated fetch() calls affected.
export const createBlobFetch = (deps: {
  blobFetchTimeout: number;
  maxBlobSize: number;
}): BlobFetch =>
  safeFetchWrap({
    // Resolve globalThis.fetch lazily, at call time rather than here, so
    // that fetch mocks (e.g. msw) installed after this function runs are
    // still honored.
    fetch: (input, init) => globalThis.fetch(input, init),
    timeout: deps.blobFetchTimeout,
    responseMaxSize: deps.maxBlobSize,
  });
