import http from "node:http";

import getPort from "get-port";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

import { runCli } from "./cli.js";

let infoSpy: MockInstance<typeof console.info>;

beforeEach(() => {
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
  it("responds as an actual HTTP server to GET requests", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "GET");
    expect(response.status).toBe(404);

    process.emit("SIGINT");
    await running;
  });

  it("responds to GET /health with 200 without any extra cli wiring", async () => {
    const { port, running } = await startCli();

    const response = await request(port, "GET", "/health");
    expect(response.status).toBe(200);

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

  it("logs a structured access log entry for each request", async () => {
    const { port, running } = await startCli(["--log-format", "json"]);
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
  });
});
