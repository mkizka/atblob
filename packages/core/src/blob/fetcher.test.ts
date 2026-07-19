import http from "node:http";

import getPort from "get-port";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { afterEach, describe, expect, it } from "vitest";

import type { Did } from "../did/did.js";
import { BadGatewayError, BadRequestError, NotFoundError } from "../errors.js";
import { createBlobFetcher } from "./fetcher.js";

const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";

const cidFor = async (bytes: Uint8Array): Promise<string> => {
  const digest = await sha256.digest(bytes);
  return CID.createV1(raw.code, digest).toString();
};

const startServer = async (
  handler: http.RequestListener,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const port = await getPort();
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolveClose) => server.close(() => resolveClose())),
  };
};

describe("createBlobFetcher", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("successfully fetches the image and passes CID verification", async () => {
    const bytes = Buffer.from("hello world");
    const cid = await cidFor(bytes);
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(bytes);
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });
    const result = await fetcher.fetchBlob(new URL(server.url), DID, cid);

    expect(result.contentType).toBe("image/png");
    expect(Buffer.from(result.bytes)).toEqual(bytes);
  });

  it("results in NotFoundError when the CID does not match the bytes", async () => {
    const bytes = Buffer.from("hello world");
    const wrongCid = await cidFor(Buffer.from("different bytes"));
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(bytes);
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, wrongCid),
    ).rejects.toThrow(NotFoundError);
  });

  it("results in NotFoundError for a 4xx response", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(NotFoundError);
  });

  it("results in BadGatewayError for a 5xx response", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("error");
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadGatewayError);
  });

  it("results in BadRequestError for a non-image content-type", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("not an image");
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError for an image/svg+xml content-type", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "image/svg+xml" });
      res.end("<svg></svg>");
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when content-length exceeds maxBlobSize", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, {
        "content-type": "image/png",
        "content-length": "2048",
      });
      res.end(Buffer.alloc(2048));
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadRequestError when the actual size exceeds maxBlobSize even without content-length", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(Buffer.alloc(2048));
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadRequestError);
  });

  it("results in BadGatewayError when the body trickles in slower than blobFetchTimeout", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "image/png" });
      res.write("a");
      setTimeout(() => {
        res.end("b");
      }, 500);
    });
    close = server.close;

    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 100,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL(server.url), DID, "cid"),
    ).rejects.toThrow(BadGatewayError);
  });

  it("results in BadGatewayError when the connection fails", async () => {
    const fetcher = createBlobFetcher({
      maxBlobSize: 1024,
      blobFetchTimeout: 1000,
      blobFetch: fetch,
    });

    await expect(
      fetcher.fetchBlob(new URL("http://127.0.0.1:1"), DID, "cid"),
    ).rejects.toThrow(BadGatewayError);
  });
});
