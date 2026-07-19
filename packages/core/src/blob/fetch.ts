import { createSafeFetch, type SafeFetch } from "../safe-fetch.js";

export const createBlobFetch = (deps: {
  blobFetchTimeout: number;
  maxBlobSize: number;
}): SafeFetch =>
  createSafeFetch({
    timeout: deps.blobFetchTimeout,
    responseMaxSize: deps.maxBlobSize,
  });
