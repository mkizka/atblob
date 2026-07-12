import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { describe, expect, it } from "vitest";

import { isCid, verifyCid } from "./cid.js";

const cidFor = async (bytes: Uint8Array): Promise<string> => {
  const digest = await sha256.digest(bytes);
  return CID.createV1(raw.code, digest).toString();
};

describe("isCid", () => {
  it("accepts a valid CID string", async () => {
    const cid = await cidFor(new TextEncoder().encode("hello"));

    expect(isCid(cid)).toBe(true);
  });

  it("rejects a string that is invalid as a CID", () => {
    expect(isCid("not-a-cid")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isCid("")).toBe(false);
  });
});

describe("verifyCid", () => {
  it("succeeds when the hash computed from bytes matches the CID", async () => {
    const bytes = new TextEncoder().encode("hello");
    const cid = await cidFor(bytes);

    await expect(verifyCid(cid, bytes)).resolves.toBeUndefined();
  });

  it("results in NotFoundError when bytes do not match the CID", async () => {
    const cid = await cidFor(new TextEncoder().encode("hello"));
    const otherBytes = new TextEncoder().encode("world");

    await expect(verifyCid(cid, otherBytes)).rejects.toThrow(
      `cid mismatch for ${cid}`,
    );
  });
});
