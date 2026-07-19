import { type Env, runCli } from "@atblob/cli";
import getPort from "get-port";
import { request as undiciRequest } from "undici";
import { vi } from "vitest";

export type LocalResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

export const request = async (
  port: number,
  path: string,
): Promise<LocalResponse> => {
  const res = await undiciRequest(`http://127.0.0.1:${port}${path}`);
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

export type LocalCli = AsyncDisposable & { port: number };

export const startCli = async (
  args: string[] = [],
  env: Env = {},
): Promise<LocalCli> => {
  const port = await getPort();
  const running = runCli(["--port", String(port), ...args], env);
  await waitForServer(port);
  return {
    port,
    [Symbol.asyncDispose]: async () => {
      process.emit("SIGINT");
      await running;
    },
  };
};
