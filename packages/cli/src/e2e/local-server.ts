import http from "node:http";

import getPort from "get-port";
import { vi } from "vitest";

import { runCli } from "../cli.js";
import type { Env } from "../config.js";

export type LocalResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

export const request = (
  port: number,
  path: string,
  method: "GET" | "HEAD" = "GET",
): Promise<LocalResponse> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });

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
