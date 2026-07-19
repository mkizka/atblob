import { createSafeFetch, type SafeFetch } from "../safe-fetch.js";

export const createDidFetch = (deps: {
  didResolveTimeout: number;
}): SafeFetch => createSafeFetch({ timeout: deps.didResolveTimeout });
