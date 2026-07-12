import type { Server } from "node:http";
import http from "node:http";

import { createRenderer } from "@atblob/core";
import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import { createAtblobApp } from "./app.js";

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

// createAtblobApp replaces the global undici dispatcher as an SSRF countermeasure,
// so using the global fetch for the test's own requests would get blocked. Use node:http instead.
function request(
  port: number,
  path: string,
  method: "GET" | "HEAD" = "GET",
): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode ?? 0, headers: res.headers });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

const startServer = async (
  app: ReturnType<typeof createAtblobApp>,
): Promise<{ port: number; close: () => Promise<void> }> => {
  const port = await getPort();
  const server: Server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    port,
    close: () =>
      new Promise((resolveClose) => server.close(() => resolveClose())),
  };
};

describe("createAtblobApp", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("a GET request to a nonexistent path results in 404", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);
    const server = await startServer(app);
    close = server.close;

    const response = await request(server.port, "/unknown");

    expect(response.status).toBe(404);
  });

  it("a GET request with an invalid preset results in 400 as BadRequestError", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);
    const server = await startServer(app);
    close = server.close;

    const response = await request(
      server.port,
      `/img/unknown-preset/plain/${DID}/${CID}`,
    );

    expect(response.status).toBe(400);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("a HEAD request with an invalid preset likewise results in 400", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });
    const app = createAtblobApp(renderer);
    const server = await startServer(app);
    close = server.close;

    const response = await request(
      server.port,
      `/img/unknown-preset/plain/${DID}/${CID}`,
      "HEAD",
    );

    expect(response.status).toBe(400);
  });
});
