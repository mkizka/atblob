import { getGlobalDispatcher } from "undici";
import { describe, expect, it } from "vitest";

import { createBlobFetch } from "./ssrf.js";

describe("createBlobFetch", () => {
  it("does not mutate undici's global dispatcher", () => {
    const dispatcherBefore = getGlobalDispatcher();

    createBlobFetch({ blobFetchTimeout: 1000, maxBlobSize: 1024 });

    expect(getGlobalDispatcher()).toBe(dispatcherBefore);
  });

  it("rejects requests to a loopback address", async () => {
    const blobFetch = createBlobFetch({
      blobFetchTimeout: 1000,
      maxBlobSize: 1024,
    });

    await expect(
      blobFetch("https://127.0.0.1/", { redirect: "error" }),
    ).rejects.toThrow();
  });

  it("rejects requests over http", async () => {
    const blobFetch = createBlobFetch({
      blobFetchTimeout: 1000,
      maxBlobSize: 1024,
    });

    await expect(
      blobFetch("http://example.com/", { redirect: "error" }),
    ).rejects.toThrow();
  });
});
