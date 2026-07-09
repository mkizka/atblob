import sharp, { type Sharp } from "sharp";

import { BadRequestError } from "../errors.js";
import type { OutputFormat, Preset } from "./presets.js";

export type TransformedImage = {
  bytes: Buffer;
  contentType: string;
};

const CONTENT_TYPES: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
  png: "image/png",
};

export const transformImage = async (
  bytes: Uint8Array,
  preset: Preset,
  format: OutputFormat,
): Promise<TransformedImage> => {
  const pipeline = sharp(bytes, { animated: false }).resize({
    width: preset.width,
    height: preset.height,
    fit: preset.fit,
    withoutEnlargement: preset.min,
  });

  let encoded: Sharp;
  switch (format) {
    case "jpeg":
    case "jpg":
      encoded = pipeline.jpeg({ quality: 100 });
      break;
    case "png":
      encoded = pipeline.png();
      break;
    case "webp":
      encoded = pipeline.webp({ quality: 100 });
      break;
  }

  try {
    const output = await encoded.toBuffer();
    return { bytes: output, contentType: CONTENT_TYPES[format] };
  } catch (cause) {
    throw new BadRequestError("failed to process image", { cause });
  }
};
