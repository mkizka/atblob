import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLruCache } from "./lru.js";

const sizeOf = (value: string): number => value.length;

describe("createLruCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns undefined when the key is not cached", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });

    expect(cache.get("a")).toBeUndefined();
  });

  it("returns the cached value before the TTL expires", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });
    cache.set("a", "value");

    expect(cache.get("a")).toBe("value");
  });

  it("returns undefined once the TTL has passed", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });
    cache.set("a", "value");

    vi.advanceTimersByTime(1001);

    expect(cache.get("a")).toBeUndefined();
  });

  it("purges expired entries in the background even without being accessed", async () => {
    const deleteSpy = vi.spyOn(Map.prototype, "delete");
    await using cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });
    cache.set("a", "value");

    vi.advanceTimersByTime(2000);

    expect(deleteSpy).toHaveBeenCalledWith("a");
  });

  it("clears the background purge interval when disposed", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });

    await cache[Symbol.asyncDispose]();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("evicts the least recently used entry once the byte cap is exceeded", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 3, sizeOf });
    cache.set("a", "aaa");

    cache.set("b", "bbb");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("bbb");
  });

  it("keeps a recently accessed entry over an older, unused one when evicting", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 2, sizeOf });
    cache.set("a", "a");
    cache.set("b", "b");
    cache.get("a");

    cache.set("c", "c");

    expect(cache.get("a")).toBe("a");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("c");
  });

  it("does not cache a value larger than the byte cap", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 2, sizeOf });

    cache.set("a", "aaa");

    expect(cache.get("a")).toBeUndefined();
  });

  it("does not cache anything when the byte cap is 0, even a zero-sized value", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 0, sizeOf });

    cache.set("a", "");

    expect(cache.get("a")).toBeUndefined();
  });

  it("counts zero-sized values toward the byte cap so they can't accumulate without bound", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 2, sizeOf });

    cache.set("a", "");
    cache.set("b", "");
    cache.set("c", "");

    const cached = ["a", "b", "c"].map((key) => cache.get(key));
    expect(cached.filter((value) => value !== undefined)).toHaveLength(2);
  });

  it("overwrites an existing key's value and refreshes its expiry", async () => {
    await using cache = createLruCache({ ttl: 1000, maxBytes: 1024, sizeOf });
    cache.set("a", "first");

    vi.advanceTimersByTime(500);
    cache.set("a", "second");
    vi.advanceTimersByTime(501);

    expect(cache.get("a")).toBe("second");
  });
});
