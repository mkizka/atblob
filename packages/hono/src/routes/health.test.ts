import type { Atblob } from "@atblob/core";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import pkg from "../../package.json" with { type: "json" };
import { createHealthHandler, HEALTH_PATH } from "./health.js";

const createApp = (checkHealth: Atblob["checkHealth"]) => {
  const atblob: Atblob = {
    render: vi.fn(),
    checkHealth,
    [Symbol.asyncDispose]: () => Promise.resolve(),
  };
  const app = new Hono();
  app.get(HEALTH_PATH, createHealthHandler(atblob));
  return app;
};

describe("createHealthHandler", () => {
  it("returns 200 with the package version when healthy", async () => {
    const app = createApp(() => Promise.resolve({ status: "ok" }));

    const res = await app.request(HEALTH_PATH);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: pkg.version, status: "ok" });
  });

  it("returns 503 with the error when unhealthy", async () => {
    const app = createApp(() =>
      Promise.resolve({ status: "error", error: "connection refused" }),
    );

    const res = await app.request(HEALTH_PATH);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      version: pkg.version,
      status: "error",
      error: "connection refused",
    });
  });
});
