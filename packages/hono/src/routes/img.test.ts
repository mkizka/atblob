import type { Renderer } from "@atblob/core";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createImgHandler, IMG_PATH } from "./img.js";

const VALID_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const createApp = (render: Renderer["render"]) => {
  const renderer: Renderer = {
    render,
    [Symbol.asyncDispose]: () => Promise.resolve(),
  };
  const app = new Hono();
  app.get(IMG_PATH, createImgHandler(renderer));
  return app;
};

describe("createImgHandler", () => {
  it("returns image bytes and headers for a GET request", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const render = vi.fn().mockResolvedValue({
      bytes,
      headers: { "Content-Type": "image/webp" },
    });
    const app = createApp(render);

    const res = await app.request(
      `/img/avatar/plain/${VALID_DID}/${VALID_CID}`,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    expect(render).toHaveBeenCalledWith({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
      format: undefined,
    });
  });

  it("returns only headers and no body for a HEAD request", async () => {
    const render = vi.fn().mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      headers: { "Content-Type": "image/webp" },
    });
    const app = createApp(render);

    const res = await app.request(
      `/img/avatar/plain/${VALID_DID}/${VALID_CID}`,
      { method: "HEAD" },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it("splits cidAndFormat into cid and format and passes them to render when it contains @", async () => {
    const render = vi.fn().mockResolvedValue({
      bytes: new Uint8Array(),
      headers: {},
    });
    const app = createApp(render);

    await app.request(`/img/avatar/plain/${VALID_DID}/${VALID_CID}@jpeg`);

    expect(render).toHaveBeenCalledWith({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
      format: "jpeg",
    });
  });

  it("treats everything after the first @ as format when cidAndFormat contains multiple @", async () => {
    const render = vi.fn().mockResolvedValue({
      bytes: new Uint8Array(),
      headers: {},
    });
    const app = createApp(render);

    await app.request(`/img/avatar/plain/${VALID_DID}/${VALID_CID}@foo@bar`);

    expect(render).toHaveBeenCalledWith({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
      format: "foo@bar",
    });
  });
});
