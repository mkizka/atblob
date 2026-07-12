import { createRenderer } from "@atblob/core";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { atblob } from "./atblob.js";

const VALID_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

describe("atblob", () => {
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
});
