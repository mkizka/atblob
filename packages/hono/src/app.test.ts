import { createRenderer } from "@atblob/core";
import { describe, expect, it } from "vitest";

import { createAtblobApp } from "./app.js";

const VALID_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

describe("createAtblobApp", () => {
  it("returns 404 for an undefined route", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);

    const res = await app.request("/not-found");

    expect(res.status).toBe(404);
  });

  it("returns 400 for BadRequestError when preset is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);

    const res = await app.request(
      `/img/unknown-preset/plain/${VALID_DID}/${VALID_CID}`,
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it("returns 400 for BadRequestError when did is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);

    const res = await app.request(`/img/avatar/plain/invalid-did/${VALID_CID}`);

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("returns 400 for BadRequestError when cid is invalid", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);

    const res = await app.request(`/img/avatar/plain/${VALID_DID}/invalid-cid`);

    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
