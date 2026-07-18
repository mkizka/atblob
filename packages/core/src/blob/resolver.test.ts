import { describe, expect, it, vi } from "vitest";

import type { Did } from "../did/did.js";
import type { PdsResolver } from "../did/resolver.js";
import type { BlobCache } from "./cache/cache.js";
import type { BlobFetcher, FetchedBlob } from "./fetcher.js";
import { createBlobResolver } from "./resolver.js";

const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const BLOB: FetchedBlob = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/png",
};

const fakePdsResolver = (
  resolvePdsEndpoint: PdsResolver["resolvePdsEndpoint"] = () =>
    Promise.resolve(new URL("https://pds.example.com")),
): PdsResolver => ({ resolvePdsEndpoint });

const fakeBlobFetcher = (
  fetchBlob: BlobFetcher["fetchBlob"] = () => Promise.resolve(BLOB),
): BlobFetcher => ({ fetchBlob });

const fakeBlobCache = (
  get: BlobCache["get"] = () => Promise.resolve(undefined),
  set: BlobCache["set"] = () => Promise.resolve(),
): BlobCache => ({ get, set });

describe("createBlobResolver", () => {
  it("returns the cached blob without calling pdsResolver or blobFetcher", async () => {
    const resolvePdsEndpoint = vi.fn(() => {
      throw new Error("should not be called");
    });
    const fetchBlob = vi.fn(() => {
      throw new Error("should not be called");
    });
    const resolver = createBlobResolver({
      pdsResolver: fakePdsResolver(resolvePdsEndpoint),
      blobFetcher: fakeBlobFetcher(fetchBlob),
      blobCache: fakeBlobCache(() => Promise.resolve(BLOB)),
    });

    const result = await resolver.resolveBlob(DID, CID);

    expect(result).toEqual(BLOB);
    expect(resolvePdsEndpoint).not.toHaveBeenCalled();
    expect(fetchBlob).not.toHaveBeenCalled();
  });

  it("resolves the pds and fetches the blob on a cache miss", async () => {
    const resolver = createBlobResolver({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(),
      blobCache: fakeBlobCache(),
    });

    const result = await resolver.resolveBlob(DID, CID);

    expect(result).toEqual(BLOB);
  });

  it("stores the fetched blob in the cache on a cache miss", async () => {
    const set = vi.fn(() => Promise.resolve());
    const resolver = createBlobResolver({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(),
      blobCache: fakeBlobCache(undefined, set),
    });

    await resolver.resolveBlob(DID, CID);

    expect(set).toHaveBeenCalledWith(DID, CID, BLOB);
  });

  it("passes the resolved pds endpoint to blobFetcher", async () => {
    const fetchBlob = vi.fn(() => Promise.resolve(BLOB));
    const pdsEndpoint = new URL("https://pds.example.com");
    const resolver = createBlobResolver({
      pdsResolver: fakePdsResolver(() => Promise.resolve(pdsEndpoint)),
      blobFetcher: fakeBlobFetcher(fetchBlob),
      blobCache: fakeBlobCache(),
    });

    await resolver.resolveBlob(DID, CID);

    expect(fetchBlob).toHaveBeenCalledWith(pdsEndpoint, DID, CID);
  });
});
