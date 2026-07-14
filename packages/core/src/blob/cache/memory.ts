import type { Did } from "../../did/did.js";
import type { FetchedBlob } from "../fetcher.js";
import type { BlobCache } from "./cache.js";

type CacheEntry = { blob: FetchedBlob; expiresAt: number };

const toKey = (did: Did, cid: string): string => `${did}:${cid}`;

export const createMemoryBlobCache = (deps: {
  blobCacheTTL: number;
}): BlobCache => {
  const store = new Map<string, CacheEntry>();

  const get = (did: Did, cid: string): Promise<FetchedBlob | undefined> => {
    const key = toKey(did, cid);
    const entry = store.get(key);
    if (!entry) {
      return Promise.resolve(undefined);
    }
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(entry.blob);
  };

  const set = (did: Did, cid: string, blob: FetchedBlob): Promise<void> => {
    store.set(toKey(did, cid), {
      blob,
      expiresAt: Date.now() + deps.blobCacheTTL,
    });
    return Promise.resolve();
  };

  return { get, set };
};
