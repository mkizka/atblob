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

  it("responds as an actual HTTP server to GET requests", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "GET");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("also responds to HEAD requests", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "HEAD");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("closes the server and releases the port on SIGINT", async () => {
    const { port, running } = await startCli();

    process.emit("SIGINT");
    await running;

    await expect(request(port)).rejects.toThrow();
  });

  it("also closes the server and releases the port on SIGTERM", async () => {
    const { port, running } = await startCli();

    process.emit("SIGTERM");
    await running;

    await expect(request(port)).rejects.toThrow();
  });

  it("listens on the PORT environment variable value when --port is not specified", async () => {
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

  it("throws without starting the server when did-cache is redis and redis-url is missing", async () => {
    await expect(runCli(["--did-cache", "redis"], {})).rejects.toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });
});

describe("runCliEntrypoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 0 on successful exit", async () => {
    const port = await getPort();
    const running = runCliEntrypoint(
      ["--port", String(port), "--did-cache", "memory"],
      {},
    );
    await waitForServer(port);

    process.emit("SIGINT");

    await expect(running).resolves.toBe(0);
  });

  it("logs the error without a stack trace and returns 1 when given an invalid argument", async () => {
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

  it("also logs the error without a stack trace and returns 1 when redis-url is missing", async () => {
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
