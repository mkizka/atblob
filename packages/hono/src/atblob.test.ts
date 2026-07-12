import { createRenderer, type Renderer } from "@atblob/core";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { atblob } from "./atblob.js";

const VALID_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

const fakeRenderer = (render: Renderer["render"]): Renderer => ({
  render,
  checkHealth: () => Promise.resolve({ status: "ok" }),
  [Symbol.asyncDispose]: () => Promise.resolve(),
});

describe("atblob", () => {
  it("returns image bytes and headers for a GET request", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const render = vi.fn().mockResolvedValue({
      bytes,
      headers: { "Content-Type": "image/webp" },
    });
    const app = new Hono().use(atblob(fakeRenderer(render)));

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
    const app = new Hono().use(atblob(fakeRenderer(render)));

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
    const app = new Hono().use(atblob(fakeRenderer(render)));

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
    const app = new Hono().use(atblob(fakeRenderer(render)));

    await app.request(`/img/avatar/plain/${VALID_DID}/${VALID_CID}@foo@bar`);

    expect(render).toHaveBeenCalledWith({
      preset: "avatar",
      did: VALID_DID,
      cid: VALID_CID,
      format: "foo@bar",
    });
  });

  it("returns 404 for an undefined route", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = new Hono().use(atblob(renderer));

    const res = await app.request("/not-found");

    expect(res.status).toBe(404);
  });

  it("returns 400 for BadRequestError when preset is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = new Hono().use(atblob(renderer));

    const res = await app.request(
      `/img/unknown-preset/plain/${VALID_DID}/${VALID_CID}`,
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it("returns 400 for BadRequestError when did is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = new Hono().use(atblob(renderer));

    const res = await app.request(`/img/avatar/plain/invalid-did/${VALID_CID}`);

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("returns 400 for BadRequestError when cid is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = new Hono().use(atblob(renderer));

    const res = await app.request(`/img/avatar/plain/${VALID_DID}/invalid-cid`);

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("passes through to other routes registered on the same app when the path does not match", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = new Hono()
      .use(atblob(renderer))
      .get("/health", (c) => c.text("ok"));

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("passes through non-GET/HEAD requests even when the path matches", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const path = `/img/avatar/plain/${VALID_DID}/${VALID_CID}`;
    const app = new Hono()
      .use(atblob(renderer))
      .post(path, (c) => c.text("posted"));

    const res = await app.request(path, { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("posted");
  });
});
