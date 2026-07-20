import { createSafeFetch } from "../safe-fetch.js";

export type DidFetch = typeof fetch;

// Wrapped independently so that host apps embedding @atblob/hono or
// @atblob/express don't have their own unrelated fetch() calls affected.
export const createDidFetch = (deps: { didResolveTimeout: number }): DidFetch =>
  createSafeFetch({ timeout: deps.didResolveTimeout });
