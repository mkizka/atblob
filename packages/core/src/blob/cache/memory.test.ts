import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Did } from "../../did/did.js";
import type { FetchedBlob } from "../fetcher.js";
import { createMemoryBlobCache } from "./memory.js";

const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";
const OTHER_DID: Did = "did:plc:aaaabbbbccccddddeeeeffff";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";
const OTHER_CID = "bafkreif6gwuzabu6mzld47twyc3jvbgu63p3rgtbadqubaxbwe4ptvzjy";

const BLOB: FetchedBlob = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/png",
};

describe("createMemoryBlobCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns undefined when the key is not cached", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
  });

  it("returns the cached blob before the TTL expires", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });
    await cache.set(DID, CID, BLOB);

    await expect(cache.get(DID, CID)).resolves.toEqual(BLOB);
  });

  it("returns undefined once the TTL has passed", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });
    await cache.set(DID, CID, BLOB);

    vi.advanceTimersByTime(1001);

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
  });

  it("distinguishes entries by did and cid", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });
    await cache.set(DID, CID, BLOB);

    await expect(cache.get(OTHER_DID, CID)).resolves.toBeUndefined();
    await expect(cache.get(DID, OTHER_CID)).resolves.toBeUndefined();
  });

  it("purges expired entries in the background even without being accessed", async () => {
    const deleteSpy = vi.spyOn(Map.prototype, "delete");
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });
    await cache.set(DID, CID, BLOB);

    vi.advanceTimersByTime(2000);

    expect(deleteSpy).toHaveBeenCalledWith(`${DID}:${CID}`);
  });

  it("clears the background purge interval when disposed", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 1024,
    });

    await cache[Symbol.asyncDispose]();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("evicts the least recently used entry once the byte cap is exceeded", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 3,
    });
    await cache.set(DID, CID, BLOB);

    const otherBlob: FetchedBlob = {
      bytes: new Uint8Array([4, 5, 6]),
      contentType: "image/png",
    };
    await cache.set(OTHER_DID, OTHER_CID, otherBlob);

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
    await expect(cache.get(OTHER_DID, OTHER_CID)).resolves.toEqual(otherBlob);
  });

  it("keeps a recently accessed entry over an older, unused one when evicting", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 2,
    });
    const first: FetchedBlob = {
      bytes: new Uint8Array([1]),
      contentType: "image/png",
    };
    const second: FetchedBlob = {
      bytes: new Uint8Array([2]),
      contentType: "image/png",
    };
    const third: FetchedBlob = {
      bytes: new Uint8Array([3]),
      contentType: "image/png",
    };
    await cache.set(DID, CID, first);
    await cache.set(DID, OTHER_CID, second);
    await cache.get(DID, CID);

    await cache.set(OTHER_DID, CID, third);

    await expect(cache.get(DID, CID)).resolves.toEqual(first);
    await expect(cache.get(DID, OTHER_CID)).resolves.toBeUndefined();
    await expect(cache.get(OTHER_DID, CID)).resolves.toEqual(third);
  });

  it("does not cache a blob larger than the byte cap", async () => {
    await using cache = createMemoryBlobCache({
      blobCacheTTL: 1000,
      blobCacheMaxBytes: 2,
    });

    await cache.set(DID, CID, BLOB);

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
  });
});
