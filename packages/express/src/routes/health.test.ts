import type { Server } from "node:http";

import type { Atblob } from "@atblob/core";
import express from "express";
import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import pkg from "../../package.json" with { type: "json" };
import { createHealthHandler, HEALTH_PATH } from "./health.js";

const fakeAtblob = (checkHealth: Atblob["checkHealth"]): Atblob => ({
  render: () => Promise.reject(new Error("not implemented")),
  checkHealth,
  [Symbol.asyncDispose]: () => Promise.resolve(),
});

const startServer = async (
  atblob: Atblob,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const port = await getPort();
  const app = express();
  app.get(HEALTH_PATH, createHealthHandler(atblob));
  const server: Server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolveClose) => server.close(() => resolveClose())),
  };
};

describe("createHealthHandler", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("returns 200 with the package version when healthy", async () => {
    const server = await startServer(
      fakeAtblob(() => Promise.resolve({ status: "ok" })),
    );
    close = server.close;

    const response = await fetch(`${server.url}${HEALTH_PATH}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      version: pkg.version,
      status: "ok",
    });
  });

  it("returns 503 with the error when unhealthy", async () => {
    const server = await startServer(
      fakeAtblob(() =>
        Promise.resolve({ status: "error", error: "connection refused" }),
      ),
    );
    close = server.close;

    const response = await fetch(`${server.url}${HEALTH_PATH}`);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      version: pkg.version,
      status: "error",
      error: "connection refused",
    });
  });
});
