import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { BadRequestError } from "../errors.js";
import type { Preset } from "./presets.js";
import { transformImage } from "./transform.js";

const createImage = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

const basePreset: Preset = {
  width: 100,
  height: 100,
  fit: "cover",
  format: "webp",
  min: true,
};

describe("transformImage", () => {
  it("presetの幅と高さにリサイズする", async () => {
    const input = await createImage(400, 300);

    const result = await transformImage(input, basePreset, "webp");

    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it("minがtrueの場合は元画像より拡大しない", async () => {
    const input = await createImage(50, 50);

    const result = await transformImage(input, basePreset, "webp");

    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(50);
  });

  it.each([
    ["jpeg", "image/jpeg"],
    ["jpg", "image/jpeg"],
    ["webp", "image/webp"],
    ["png", "image/png"],
  ] as const)(
    "formatが%sの場合contentTypeは%s",
    async (format, contentType) => {
      const input = await createImage(100, 100);

      const result = await transformImage(input, basePreset, format);

      expect(result.contentType).toBe(contentType);
    },
  );

  it("不正な画像データはBadRequestErrorになる", async () => {
    const input = new Uint8Array([1, 2, 3]);

    await expect(transformImage(input, basePreset, "webp")).rejects.toThrow(
      BadRequestError,
    );
  });
});
