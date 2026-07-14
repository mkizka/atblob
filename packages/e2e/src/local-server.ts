import { type Env, runCli } from "@atblob/cli";
import getPort from "get-port";
import { Agent, request as undiciRequest } from "undici";
import { vi } from "vitest";

export type LocalResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

// A dedicated dispatcher, never the global one: atblob's own SSRF protection
// installs a global dispatcher that blocks loopback addresses, and
// upstream.ts's msw server intercepts the global fetch() - neither should be
// involved when this test client talks to its own local cli. undici.request()
// isn't touched by either as long as we pass a plain, explicit dispatcher.
const localDispatcher = new Agent();

export const request = async (
  port: number,
  path: string,
  method: "GET" | "HEAD" = "GET",
): Promise<LocalResponse> => {
  const res = await undiciRequest(`http://127.0.0.1:${port}${path}`, {
    method,
    dispatcher: localDispatcher,
  });
  return {
    status: res.statusCode,
    headers: res.headers,
    body: Buffer.from(await res.body.arrayBuffer()),
  };
};

const waitForServer = async (port: number): Promise<void> => {
  await vi.waitFor(
    async () => {
      await request(port, "/not-found");
    },
    { timeout: 5000, interval: 100 },
  );
};

export const startCli = async (
  args: string[] = [],
  env: Env = {},
): Promise<{ port: number; stop: () => Promise<void> }> => {
  const port = await getPort();
  const running = runCli(
    ["--port", String(port), "--did-cache", "memory", ...args],
    env,
  );
  await waitForServer(port);
  return {
    port,
    stop: async () => {
      process.emit("SIGINT");
      await running;
    },
  };
};
