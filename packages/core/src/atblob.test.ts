import { describe, expect, it } from "vitest";

import { createAtblob } from "./atblob.js";

describe("createAtblob", () => {
  it("reports ok health with no checks when using the memory did cache", async () => {
    await using atblob = await createAtblob({ didCache: "memory" });

    const result = await atblob.checkHealth();

    expect(result).toEqual({ status: "ok", checks: {} });
  });
});
