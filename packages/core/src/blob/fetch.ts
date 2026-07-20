import { createSafeFetch } from "../safe-fetch.js";

export type BlobFetch = typeof fetch;

// Wrapped independently so that host apps embedding @atblob/hono or
// @atblob/express don't have their own unrelated fetch() calls affected.
export const createBlobFetch = (deps: {
  blobFetchTimeout: number;
  maxBlobSize: number;
}): BlobFetch =>
  createSafeFetch({
    timeout: deps.blobFetchTimeout,
    responseMaxSize: deps.maxBlobSize,
  });
