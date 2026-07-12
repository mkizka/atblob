import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { BlobFetcher } from "../blob/fetcher.js";
import type { PdsResolver } from "../did/resolver.js";
import { BadGatewayError, BadRequestError } from "../errors.js";
import { createRenderer } from "./render.js";

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

describe("createRenderer", () => {
  it("results in BadRequestError when preset is unknown", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
    });

    await expect(
      render({ preset: "unknown", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when did is invalid", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
    });

    await expect(
      render({ preset: "avatar", did: "invalid-did", cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when cid is invalid", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: "invalid-cid" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when format is unsupported", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
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

  it("returns the image and headers for valid input", async () => {
    const bytes = await createImageBytes();
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() =>
        Promise.resolve({ bytes, contentType: "image/png" }),
      ),
    });

    const result = await render({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
    });

    expect(result.headers).toEqual({
      "Cache-Control": "public, max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": "image/webp",
    });
  });

  it("results in BadGatewayError when did resolution fails", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(() =>
        Promise.reject(new Error("resolve failed")),
      ),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadGatewayError);
  });
});
