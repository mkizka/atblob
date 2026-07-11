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
  it("有効なCIDの文字列を受け入れる", async () => {
    const cid = await cidFor(new TextEncoder().encode("hello"));

    expect(isCid(cid)).toBe(true);
  });

  it("CIDとして不正な文字列は拒否する", () => {
    expect(isCid("not-a-cid")).toBe(false);
  });

  it("空文字は拒否する", () => {
    expect(isCid("")).toBe(false);
  });
});

describe("verifyCid", () => {
  it("bytesから計算したハッシュがCIDと一致する場合は成功する", async () => {
    const bytes = new TextEncoder().encode("hello");
    const cid = await cidFor(bytes);

    await expect(verifyCid(cid, bytes)).resolves.toBeUndefined();
  });

  it("bytesがCIDと一致しない場合はNotFoundErrorになる", async () => {
    const cid = await cidFor(new TextEncoder().encode("hello"));
    const otherBytes = new TextEncoder().encode("world");

    await expect(verifyCid(cid, otherBytes)).rejects.toThrow(
      `cid mismatch for ${cid}`,
    );
  });
});
