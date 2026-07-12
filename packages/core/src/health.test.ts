import { describe, expect, it } from "vitest";

import { runHealthChecks } from "./health.js";

describe("runHealthChecks", () => {
  it("returns ok with no checks when there are no checks to run", async () => {
    const result = await runHealthChecks({});

    expect(result).toEqual({ status: "ok", checks: {} });
  });

  it("returns ok when every check succeeds", async () => {
    const result = await runHealthChecks({
      a: () => Promise.resolve(),
      b: () => Promise.resolve(),
    });

    expect(result).toEqual({
      status: "ok",
      checks: { a: { status: "ok" }, b: { status: "ok" } },
    });
  });

  it("returns error and includes the failure message when a check throws", async () => {
    const result = await runHealthChecks({
      a: () => Promise.resolve(),
      b: () => Promise.reject(new Error("connection refused")),
    });

    expect(result).toEqual({
      status: "error",
      checks: {
        a: { status: "ok" },
        b: { status: "error", error: "connection refused" },
      },
    });
  });
});
