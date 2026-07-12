import type { Server } from "node:http";

import type { Renderer } from "@atblob/core";
import express, { type ErrorRequestHandler } from "express";
import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import { createImgHandler, IMG_PATH } from "./img.js";

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const fakeRenderer = (render: Renderer["render"]): Renderer => ({
  render,
  [Symbol.asyncDispose]: () => Promise.resolve(),
});

const startServer = async (
  renderer: Renderer,
  errorHandler?: ErrorRequestHandler,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const port = await getPort();
  const app = express();
  const handler = createImgHandler(renderer);
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

  it("returns the image and headers for a GET request", async () => {
    const bytes = new TextEncoder().encode("image-bytes");
    const server = await startServer(
      fakeRenderer(() =>
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

  it("returns only headers and no body for a HEAD request", async () => {
    const bytes = new TextEncoder().encode("image-bytes");
    const server = await startServer(
      fakeRenderer(() =>
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

  it("splits cidAndFormat into cid and format and passes them to render when it contains @", async () => {
    let received: unknown;
    const server = await startServer(
      fakeRenderer((input) => {
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

  it("passes format as undefined to render when cidAndFormat does not contain @", async () => {
    let received: unknown;
    const server = await startServer(
      fakeRenderer((input) => {
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

  it("passes the error to next and delegates to Express's error handler when render fails", async () => {
    const boom = new Error("boom");
    let caught: unknown;
    const server = await startServer(
      fakeRenderer(() => Promise.reject(boom)),
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
