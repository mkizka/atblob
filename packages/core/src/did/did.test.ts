import { describe, expect, it } from "vitest";

import { isDid } from "./did.js";

describe("isDid", () => {
  it("did:plc形式の値を受け入れる", () => {
    expect(isDid("did:plc:z72i7hdynmk6r22z27h6tvur")).toBe(true);
  });

  it("did:web形式の値を受け入れる", () => {
    expect(isDid("did:web:example.com")).toBe(true);
  });

  it("didで始まらない値は拒否する", () => {
    expect(isDid("plc:z72i7hdynmk6r22z27h6tvur")).toBe(false);
  });

  it("plc,web以外のメソッドは拒否する", () => {
    expect(isDid("did:key:z72i7hdynmk6r22z27h6tvur")).toBe(false);
  });

  it("識別子が空の値は拒否する", () => {
    expect(isDid("did:plc:")).toBe(false);
  });

  it("空文字は拒否する", () => {
    expect(isDid("")).toBe(false);
  });
});
