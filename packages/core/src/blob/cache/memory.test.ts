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
    await using cache = createMemoryBlobCache({ blobCacheTTL: 1000 });

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
  });

  it("returns the cached blob before the TTL expires", async () => {
    await using cache = createMemoryBlobCache({ blobCacheTTL: 1000 });
    await cache.set(DID, CID, BLOB);

    await expect(cache.get(DID, CID)).resolves.toEqual(BLOB);
  });

  it("returns undefined once the TTL has passed", async () => {
    await using cache = createMemoryBlobCache({ blobCacheTTL: 1000 });
    await cache.set(DID, CID, BLOB);

    vi.advanceTimersByTime(1001);

    await expect(cache.get(DID, CID)).resolves.toBeUndefined();
  });

  it("distinguishes entries by did and cid", async () => {
    await using cache = createMemoryBlobCache({ blobCacheTTL: 1000 });
    await cache.set(DID, CID, BLOB);

    await expect(cache.get(OTHER_DID, CID)).resolves.toBeUndefined();
    await expect(cache.get(DID, OTHER_CID)).resolves.toBeUndefined();
  });

  it("purges expired entries in the background even without being accessed", async () => {
    const deleteSpy = vi.spyOn(Map.prototype, "delete");
    await using cache = createMemoryBlobCache({ blobCacheTTL: 1000 });
    await cache.set(DID, CID, BLOB);

    vi.advanceTimersByTime(2000);

    expect(deleteSpy).toHaveBeenCalledWith(`${DID}:${CID}`);
  });

  it("clears the background purge interval when disposed", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const cache = createMemoryBlobCache({ blobCacheTTL: 1000 });

    await cache[Symbol.asyncDispose]();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
