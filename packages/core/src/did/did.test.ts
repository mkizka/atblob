import { describe, expect, it } from "vitest";

import { isDid } from "./did.js";

describe("isDid", () => {
  it("accepts a value in did:plc format", () => {
    expect(isDid("did:plc:z72i7hdynmk6r22z27h6tvur")).toBe(true);
  });

  it("accepts a value in did:web format", () => {
    expect(isDid("did:web:example.com")).toBe(true);
  });

  it("rejects a value that does not start with did", () => {
    expect(isDid("plc:z72i7hdynmk6r22z27h6tvur")).toBe(false);
  });

  it("rejects methods other than plc and web", () => {
    expect(isDid("did:key:z72i7hdynmk6r22z27h6tvur")).toBe(false);
  });

  it("rejects a value with an empty identifier", () => {
    expect(isDid("did:plc:")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isDid("")).toBe(false);
  });
});
