import { describe, expect, it } from "vitest";

import { createRenderer } from "./renderer.js";

describe("createRenderer", () => {
  it("reports ok health when using the memory did cache", async () => {
    await using renderer = await createRenderer({ didCache: "memory" });

    const result = await renderer.checkHealth();

    expect(result).toEqual({ status: "ok" });
  });
});
