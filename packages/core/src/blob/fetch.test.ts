import { once } from "node:events";
import { createServer } from "node:http";

import getPort from "get-port";
import { describe, expect, it } from "vitest";

import { createBlobFetch } from "./fetch.js";

describe("createBlobFetch", () => {
  const blobFetch = createBlobFetch({
    blobFetchTimeout: 1000,
    maxBlobSize: 1024,
    ssrfProtection: true,
  });

  it("rejects requests to a loopback address", async () => {
    await expect(
      blobFetch("https://127.0.0.1/", { redirect: "error" }),
    ).rejects.toThrow();
  });

  it("rejects requests over http", async () => {
    await expect(
      blobFetch("http://example.com/", { redirect: "error" }),
    ).rejects.toThrow();
  });

  it("allows http requests to a loopback address when ssrfProtection is false", async () => {
    const port = await getPort();
    const server = createServer((_, res) => res.end("ok")).listen(
      port,
      "127.0.0.1",
    );
    await once(server, "listening");
    const unsafeFetch = createBlobFetch({
      blobFetchTimeout: 1000,
      maxBlobSize: 1024,
      ssrfProtection: false,
    });

    const res = await unsafeFetch(`http://127.0.0.1:${port}/`, {
      redirect: "error",
    });

    expect(await res.text()).toBe("ok");
    server.close();
  });
});
