import { getGlobalDispatcher } from "undici";
import { describe, expect, it } from "vitest";

import { createSafeFetch } from "./ssrf.js";

describe("createSafeFetch", () => {
  it("does not mutate undici's global dispatcher", () => {
    const dispatcherBefore = getGlobalDispatcher();

    createSafeFetch({ timeout: 1000 });

    expect(getGlobalDispatcher()).toBe(dispatcherBefore);
  });

  it("rejects requests to a loopback address", async () => {
    const safeFetch = createSafeFetch({ timeout: 1000 });

    await expect(
      safeFetch("https://127.0.0.1/", { redirect: "error" }),
    ).rejects.toThrow();
  });

  it("rejects requests over http", async () => {
    const safeFetch = createSafeFetch({ timeout: 1000 });

    await expect(
      safeFetch("http://example.com/", { redirect: "error" }),
    ).rejects.toThrow();
  });
});
