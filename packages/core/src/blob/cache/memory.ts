import { createLruCache } from "../../cache/lru.js";
import type { Did } from "../../did/did.js";
import type { FetchedBlob } from "../fetcher.js";
import type { BlobCache } from "./cache.js";

const toKey = (did: Did, cid: string): string => `${did}:${cid}`;

type MemoryBlobCache = BlobCache & Disposable;

export const createMemoryBlobCache = (deps: {
  blobCacheTTL: number;
  blobCacheMaxBytes: number;
}): MemoryBlobCache => {
  const cache = createLruCache<FetchedBlob>({
    ttl: deps.blobCacheTTL,
    maxBytes: deps.blobCacheMaxBytes,
    sizeOf: (blob) => blob.bytes.byteLength,
  });

  const get = (did: Did, cid: string): Promise<FetchedBlob | undefined> => {
    return Promise.resolve(cache.get(toKey(did, cid)));
  };

  const set = (did: Did, cid: string, blob: FetchedBlob): Promise<void> => {
    cache.set(toKey(did, cid), blob);
    return Promise.resolve();
  };

  return {
    get,
    set,
    [Symbol.dispose]: () => cache[Symbol.dispose](),
  };
};
