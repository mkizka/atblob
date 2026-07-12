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
  it("returns 200 with the package version and checks when every check is ok", async () => {
    const app = createApp(() =>
      Promise.resolve({ status: "ok", checks: { redis: { status: "ok" } } }),
    );

    const res = await app.request(HEALTH_PATH);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      version: pkg.version,
      status: "ok",
      checks: { redis: { status: "ok" } },
    });
  });

  it("returns 200 with an empty checks object when there is nothing to check", async () => {
    const app = createApp(() => Promise.resolve({ status: "ok", checks: {} }));

    const res = await app.request(HEALTH_PATH);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      version: pkg.version,
      status: "ok",
      checks: {},
    });
  });

  it("returns 503 with the failing check's error when a check fails", async () => {
    const app = createApp(() =>
      Promise.resolve({
        status: "error",
        checks: {
          redis: { status: "error", error: "connection refused" },
        },
      }),
    );

    const res = await app.request(HEALTH_PATH);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      version: pkg.version,
      status: "error",
      checks: {
        redis: { status: "error", error: "connection refused" },
      },
    });
  });
});
