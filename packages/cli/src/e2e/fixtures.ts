import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import sharp from "sharp";

export const cidFor = async (bytes: Uint8Array): Promise<string> => {
  const digest = await sha256.digest(bytes);
  return CID.createV1(raw.code, digest).toString();
};

export const createTestImage = (
  opts: {
    width?: number;
    height?: number;
    background?: { r: number; g: number; b: number };
  } = {},
): Promise<Buffer> =>
  sharp({
    create: {
      width: opts.width ?? 400,
      height: opts.height ?? 200,
      channels: 3,
      background: opts.background ?? { r: 0, g: 128, b: 255 },
    },
  })
    .png()
    .toBuffer();
