export type LruCache<V> = {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
} & Disposable;

type CacheEntry<V> = { value: V; expiresAt: number; size: number };

export const createLruCache = <V>(deps: {
  ttl: number;
  maxBytes: number;
  sizeOf: (value: V) => number;
}): LruCache<V> => {
  const store = new Map<string, CacheEntry<V>>();
  let totalBytes = 0;

  const removeEntry = (key: string, entry: CacheEntry<V>): void => {
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

  const get = (key: string): V | undefined => {
    const entry = store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      removeEntry(key, entry);
      return undefined;
    }
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  };

  const set = (key: string, value: V): void => {
    // Charge at least 1 byte per entry so zero-sized values still count
    // toward the cap and eviction — otherwise they could accumulate without bound.
    const size = Math.max(deps.sizeOf(value), 1);
    if (size > deps.maxBytes) {
      return;
    }
    const existing = store.get(key);
    if (existing) {
      removeEntry(key, existing);
    }
    while (totalBytes + size > deps.maxBytes && store.size > 0) {
      evictLeastRecentlyUsed();
    }
    store.set(key, { value, expiresAt: Date.now() + deps.ttl, size });
    totalBytes += size;
  };

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expiresAt) {
        removeEntry(key, entry);
      }
    }
  }, deps.ttl);
  timer.unref();

  return {
    get,
    set,
    [Symbol.dispose]: () => {
      clearInterval(timer);
    },
  };
};
