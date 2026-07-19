import type { Did } from "../../did/did.js";
import type { FetchedBlob } from "../fetcher.js";
import type { BlobCache } from "./cache.js";

type CacheEntry = { blob: FetchedBlob; expiresAt: number; size: number };

const toKey = (did: Did, cid: string): string => `${did}:${cid}`;

export type MemoryBlobCache = BlobCache & AsyncDisposable;

export const createMemoryBlobCache = (deps: {
  blobCacheTTL: number;
  blobCacheMaxBytes: number;
}): MemoryBlobCache => {
  const store = new Map<string, CacheEntry>();
  let totalBytes = 0;

  const removeEntry = (key: string, entry: CacheEntry): void => {
    store.delete(key);
    totalBytes -= entry.size;
  };

  // Map preserves insertion order, so the first entry is the least recently used.
  const evictLeastRecentlyUsed = (): void => {
    const oldest = store.entries().next().value;
    if (oldest) {
      removeEntry(...oldest);
    }
  };

  const get = (did: Did, cid: string): Promise<FetchedBlob | undefined> => {
    const key = toKey(did, cid);
    const entry = store.get(key);
    if (!entry) {
      return Promise.resolve(undefined);
    }
    if (Date.now() > entry.expiresAt) {
      removeEntry(key, entry);
      return Promise.resolve(undefined);
    }
    store.delete(key);
    store.set(key, entry);
    return Promise.resolve(entry.blob);
  };

  const set = (did: Did, cid: string, blob: FetchedBlob): Promise<void> => {
    // Charge at least 1 byte per entry so zero-byte blobs still count toward
    // the cap and eviction — otherwise they could accumulate without bound.
    const size = Math.max(blob.bytes.byteLength, 1);
    if (size > deps.blobCacheMaxBytes) {
      return Promise.resolve();
    }
    const key = toKey(did, cid);
    const existing = store.get(key);
    if (existing) {
      removeEntry(key, existing);
    }
    while (totalBytes + size > deps.blobCacheMaxBytes && store.size > 0) {
      evictLeastRecentlyUsed();
    }
    store.set(key, { blob, expiresAt: Date.now() + deps.blobCacheTTL, size });
    totalBytes += size;
    return Promise.resolve();
  };

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expiresAt) {
        removeEntry(key, entry);
      }
    }
  }, deps.blobCacheTTL);
  timer.unref();

  return {
    get,
    set,
    [Symbol.asyncDispose]: () => {
      clearInterval(timer);
      return Promise.resolve();
    },
  };
};
