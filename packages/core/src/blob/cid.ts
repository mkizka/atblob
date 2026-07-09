import { CID } from "multiformats/cid";
import { hasCode } from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";

import { NotFoundError } from "../errors.js";

export const isCid = (value: string): boolean => {
  try {
    CID.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const verifyCid = async (
  cidStr: string,
  bytes: Uint8Array,
): Promise<void> => {
  const cid = CID.parse(cidStr);
  const digest = await sha256.digest(bytes);
  if (
    !hasCode(cid.multihash, sha256.code) ||
    !Buffer.from(digest.digest).equals(Buffer.from(cid.multihash.digest))
  ) {
    throw new NotFoundError(`cid mismatch for ${cidStr}`);
  }
};
