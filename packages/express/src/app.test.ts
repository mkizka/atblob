import type { Server } from "node:http";
import http from "node:http";

import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import { createAtblobApp } from "./app.js";

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
const CID = "bafkreidykmkzxc7zxarcqodlerlmadmiu3zoo5wp3jdchlaqiwhxo3wjqe";

// createAtblobAppはSSRF対策としてグローバルなundici dispatcherを差し替えるため、
// テスト自身のリクエストにグローバルfetchを使うと弾かれてしまう。node:httpを使う。
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
  app: Awaited<ReturnType<typeof createAtblobApp>>,
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

  it("存在しないパスへのGETリクエストは404になる", async () => {
    await using app = await createAtblobApp({ didCache: "memory" });
    const server = await startServer(app);
    close = server.close;

    const response = await request(server.port, "/unknown");

    expect(response.status).toBe(404);
  });

  it("不正なpresetへのGETリクエストはBadRequestErrorとして400になる", async () => {
    await using app = await createAtblobApp({ didCache: "memory" });
    const server = await startServer(app);
    close = server.close;

    const response = await request(
      server.port,
      `/img/unknown-preset/plain/${DID}/${CID}`,
    );

    expect(response.status).toBe(400);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("不正なpresetへのHEADリクエストも同様に400になる", async () => {
    await using app = await createAtblobApp({ didCache: "memory" });
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
