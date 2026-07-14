import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { BlobCache } from "../blob/cache/cache.js";
import type { BlobFetcher } from "../blob/fetcher.js";
import type { PdsResolver } from "../did/resolver.js";
import { BadGatewayError, BadRequestError } from "../errors.js";
import { createRenderFn } from "./render.js";

const VALID_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const createImageBytes = (): Promise<Buffer> =>
  sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .png()
    .toBuffer();

const fakePdsResolver = (
  resolvePdsEndpoint: PdsResolver["resolvePdsEndpoint"] = () =>
    Promise.resolve("https://pds.example.com"),
): PdsResolver => ({ resolvePdsEndpoint });

const fakeBlobFetcher = (fetchBlob: BlobFetcher["fetchBlob"]): BlobFetcher => ({
  fetchBlob,
});

const fakeBlobCache = (
  get: BlobCache["get"] = () => Promise.resolve(undefined),
  set: BlobCache["set"] = () => Promise.resolve(),
): BlobCache => ({ get, set });

describe("createRenderFn", () => {
  it("results in BadRequestError when preset is unknown", async () => {
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      blobCache: fakeBlobCache(),
    });

    await expect(
      render({ preset: "unknown", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when did is invalid", async () => {
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      blobCache: fakeBlobCache(),
    });

    await expect(
      render({ preset: "avatar", did: "invalid-did", cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when cid is invalid", async () => {
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      blobCache: fakeBlobCache(),
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: "invalid-cid" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when format is unsupported", async () => {
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      blobCache: fakeBlobCache(),
    });

    await expect(
      render({
        preset: "avatar",
        did: VALID_DID,
        cid: VALID_CID,
        format: "gif",
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it("returns the transformed image for valid input", async () => {
    const bytes = await createImageBytes();
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() =>
        Promise.resolve({ bytes, contentType: "image/png" }),
      ),
      blobCache: fakeBlobCache(),
    });

    const result = await render({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
    });

    expect(result.contentType).toBe("image/webp");
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });

  it("returns the cached blob without calling pdsResolver or blobFetcher", async () => {
    const bytes = await createImageBytes();
    const resolvePdsEndpoint = vi.fn(() => {
      throw new Error("should not be called");
    });
    const fetchBlob = vi.fn(() => {
      throw new Error("should not be called");
    });
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(resolvePdsEndpoint),
      blobFetcher: fakeBlobFetcher(fetchBlob),
      blobCache: fakeBlobCache(() =>
        Promise.resolve({ bytes, contentType: "image/png" }),
      ),
    });

    const result = await render({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
    });

    expect(result.contentType).toBe("image/webp");
    expect(resolvePdsEndpoint).not.toHaveBeenCalled();
    expect(fetchBlob).not.toHaveBeenCalled();
  });

  it("stores the fetched blob in the cache on a cache miss", async () => {
    const bytes = await createImageBytes();
    const set = vi.fn(() => Promise.resolve());
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() =>
        Promise.resolve({ bytes, contentType: "image/png" }),
      ),
      blobCache: fakeBlobCache(undefined, set),
    });

    await render({ preset: "avatar", did: VALID_DID, cid: VALID_CID });

    expect(set).toHaveBeenCalledWith(VALID_DID, VALID_CID, {
      bytes,
      contentType: "image/png",
    });
  });

  it("results in BadGatewayError when did resolution fails", async () => {
    const render = createRenderFn({
      pdsResolver: fakePdsResolver(() =>
        Promise.reject(new Error("resolve failed")),
      ),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      blobCache: fakeBlobCache(),
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadGatewayError);
  });
});
