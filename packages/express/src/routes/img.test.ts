import type { Server } from "node:http";

import { type Atblob, createNoopLogger } from "@atblob/core";
import express, { type ErrorRequestHandler } from "express";
import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import { createImgHandler, IMG_PATH } from "./img.js";

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const fakeAtblob = (render: Atblob["render"]): Atblob => ({
  render,
  logger: createNoopLogger(),
  [Symbol.asyncDispose]: () => Promise.resolve(),
});

const startServer = async (
  atblob: Atblob,
  errorHandler?: ErrorRequestHandler,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const port = await getPort();
  const app = express();
  const handler = createImgHandler(atblob);
  app.get(IMG_PATH, handler);
  app.head(IMG_PATH, handler);
  if (errorHandler) {
    app.use(errorHandler);
  }
  const server: Server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolveClose) => server.close(() => resolveClose())),
  };
};

describe("createImgHandler", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("GETリクエストで画像とヘッダーを返す", async () => {
    const bytes = new TextEncoder().encode("image-bytes");
    const server = await startServer(
      fakeAtblob(() =>
        Promise.resolve({ bytes, headers: { "Content-Type": "image/webp" } }),
      ),
    );
    close = server.close;

    const response = await fetch(
      `${server.url}/img/avatar/plain/${DID}/${CID}`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("HEADリクエストではヘッダーのみでボディを返さない", async () => {
    const bytes = new TextEncoder().encode("image-bytes");
    const server = await startServer(
      fakeAtblob(() =>
        Promise.resolve({ bytes, headers: { "Content-Type": "image/webp" } }),
      ),
    );
    close = server.close;

    const response = await fetch(
      `${server.url}/img/avatar/plain/${DID}/${CID}`,
      { method: "HEAD" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
  });

  it("cidAndFormatに@が含まれる場合はcidとformatに分割してrenderへ渡す", async () => {
    let received: unknown;
    const server = await startServer(
      fakeAtblob((input) => {
        received = input;
        return Promise.resolve({ bytes: new Uint8Array(), headers: {} });
      }),
    );
    close = server.close;

    await fetch(`${server.url}/img/avatar/plain/${DID}/${CID}@png`);

    expect(received).toEqual({
      preset: "avatar",
      did: DID,
      cid: CID,
      format: "png",
    });
  });

  it("cidAndFormatに@が含まれない場合はformatをundefinedでrenderへ渡す", async () => {
    let received: unknown;
    const server = await startServer(
      fakeAtblob((input) => {
        received = input;
        return Promise.resolve({ bytes: new Uint8Array(), headers: {} });
      }),
    );
    close = server.close;

    await fetch(`${server.url}/img/avatar/plain/${DID}/${CID}`);

    expect(received).toEqual({
      preset: "avatar",
      did: DID,
      cid: CID,
      format: undefined,
    });
  });

  it("renderが失敗した場合はnextにエラーを渡してExpressのエラーハンドラーに委譲する", async () => {
    const boom = new Error("boom");
    let caught: unknown;
    const server = await startServer(
      fakeAtblob(() => Promise.reject(boom)),
      (err, _req, res, _next) => {
        caught = err;
        res.status(502).end();
      },
    );
    close = server.close;

    const response = await fetch(
      `${server.url}/img/avatar/plain/${DID}/${CID}`,
    );

    expect(response.status).toBe(502);
    expect(caught).toBe(boom);
  });
});
