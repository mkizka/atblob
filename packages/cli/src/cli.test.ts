import http from "node:http";

import getPort from "get-port";
import { describe, expect, it, vi } from "vitest";

import { runCli } from "./cli.js";

function request(
  port: number,
  method: "GET" | "HEAD" = "GET",
  path = "/",
): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode ?? 0 });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(port: number): Promise<void> {
  await vi.waitFor(
    async () => {
      await request(port);
    },
    { timeout: 5000, interval: 100 },
  );
}

async function startCli(
  args: string[] = [],
  env: Record<string, string | undefined> = {},
): Promise<{ port: number; running: Promise<void> }> {
  const port = await getPort();
  const running = runCli(
    ["--port", String(port), "--did-cache", "memory", ...args],
    env,
  );
  await waitForServer(port);
  return { port, running };
}

describe("runCli", () => {
  it("GETリクエストに実際のHTTPサーバーとして応答する", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "GET");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("HEADリクエストにも応答する", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "HEAD");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("SIGINTを受け取るとサーバーを閉じてポートを解放する", async () => {
    const { port, running } = await startCli();

    process.emit("SIGINT");
    await running;

    await expect(request(port)).rejects.toThrow();
  });

  it("SIGTERMを受け取ってもサーバーを閉じてポートを解放する", async () => {
    const { port, running } = await startCli();

    process.emit("SIGTERM");
    await running;

    await expect(request(port)).rejects.toThrow();
  });

  it("--portを指定しない場合はPORT環境変数の値でリッスンする", async () => {
    const port = await getPort();
    const running = runCli(["--did-cache", "memory"], {
      PORT: String(port),
    });
    await waitForServer(port);

    const response = await request(port, "GET");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("did-cacheがredisでredis-urlが無い場合はサーバーを起動せずエラーになる", async () => {
    await expect(runCli(["--did-cache", "redis"], {})).rejects.toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });

  it("リクエストごとにアクセスログを出力する", async () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const { port, running } = await startCli();
    infoSpy.mockClear();

    await request(port, "GET", "/some-path");

    const outputs: unknown[] = infoSpy.mock.calls.map((call) => {
      const parsed: unknown = JSON.parse(String(call[0]));
      return parsed;
    });
    const accessLog = outputs.find(
      (output) =>
        typeof output === "object" &&
        output !== null &&
        "message" in output &&
        output.message === "access",
    );
    expect(accessLog).toMatchObject({
      method: "GET",
      path: "/some-path",
      status: 404,
      durationMs: expect.any(Number),
    });

    process.emit("SIGINT");
    await running;
    infoSpy.mockRestore();
  });
});
