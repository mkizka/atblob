import { describe, expect, it } from "vitest";

import { createHostLimiter } from "./host-limiter.js";

describe("createHostLimiter", () => {
  it("allows acquiring up to the configured limit for a host", () => {
    const limiter = createHostLimiter(2);

    expect(limiter.acquire("example.com")).toBe(true);
    expect(limiter.acquire("example.com")).toBe(true);
    expect(limiter.acquire("example.com")).toBe(false);
  });

  it("tracks each host independently", () => {
    const limiter = createHostLimiter(1);

    expect(limiter.acquire("a.example.com")).toBe(true);
    expect(limiter.acquire("b.example.com")).toBe(true);
  });

  it("allows acquiring again after releasing", () => {
    const limiter = createHostLimiter(1);

    expect(limiter.acquire("example.com")).toBe(true);
    expect(limiter.acquire("example.com")).toBe(false);

    limiter.release("example.com");

    expect(limiter.acquire("example.com")).toBe(true);
  });
});
