import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { BlobFetcher } from "../blob/fetcher.js";
import type { PdsResolver } from "../did/resolver.js";
import { BadGatewayError, BadRequestError } from "../errors.js";
import { createNoopLogger } from "../logger.js";
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

const noopLogger = createNoopLogger();

describe("createRenderer", () => {
  it("presetが未知の場合はBadRequestErrorになる", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      logger: noopLogger,
    });

    await expect(
      render({ preset: "unknown", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("didが不正な場合はBadRequestErrorになる", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      logger: noopLogger,
    });

    await expect(
      render({ preset: "avatar", did: "invalid-did", cid: VALID_CID }),
    ).rejects.toThrow(BadRequestError);
  });

  it("cidが不正な場合はBadRequestErrorになる", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      logger: noopLogger,
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: "invalid-cid" }),
    ).rejects.toThrow(BadRequestError);
  });

  it("formatが未対応の場合はBadRequestErrorになる", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      logger: noopLogger,
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

  it("正常な入力の場合は画像とヘッダーを返す", async () => {
    const bytes = await createImageBytes();
    const render = createRenderer({
      pdsResolver: fakePdsResolver(),
      blobFetcher: fakeBlobFetcher(() =>
        Promise.resolve({ bytes, contentType: "image/png" }),
      ),
      logger: noopLogger,
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

  it("did解決に失敗した場合はBadGatewayErrorになる", async () => {
    const render = createRenderer({
      pdsResolver: fakePdsResolver(() =>
        Promise.reject(new Error("resolve failed")),
      ),
      blobFetcher: fakeBlobFetcher(() => {
        throw new Error("should not be called");
      }),
      logger: noopLogger,
    });

    await expect(
      render({ preset: "avatar", did: VALID_DID, cid: VALID_CID }),
    ).rejects.toThrow(BadGatewayError);
  });
});
