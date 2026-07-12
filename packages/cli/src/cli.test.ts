import http from "node:http";

import getPort from "get-port";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli, runCliEntrypoint } from "./cli.js";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
});

describe("runCliEntrypoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常終了時は0を返す", async () => {
    const port = await getPort();
    const running = runCliEntrypoint(
      ["--port", String(port), "--did-cache", "memory"],
      {},
    );
    await waitForServer(port);

    process.emit("SIGINT");

    await expect(running).resolves.toBe(0);
  });

  it("不正な引数を渡した場合はスタックトレースを流さずログに記録し1を返す", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const exitCode = await runCliEntrypoint(
      ["--did-cache", "invalid-value"],
      {},
    );

    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const output: unknown = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(output).toMatchObject({ level: "error" });
  });

  it("redis-urlが無い場合もスタックトレースを流さずログに記録し1を返す", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const exitCode = await runCliEntrypoint(["--did-cache", "redis"], {});

    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const output: unknown = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      level: "error",
      message:
        '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    });
  });
});
