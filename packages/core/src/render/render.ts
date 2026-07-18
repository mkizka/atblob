import { isCid } from "../blob/cid.js";
import type { BlobResolver } from "../blob/resolver.js";
import { withSsrfProtection } from "../blob/ssrf.js";
import { isDid } from "../did/did.js";
import {
  AtblobHttpError,
  BadGatewayError,
  BadRequestError,
} from "../errors.js";
import { isOutputFormat, isPresetName, PRESETS } from "../image/presets.js";
import { type TransformedImage, transformImage } from "../image/transform.js";

export type ImageRequestInput = {
  preset: string;
  did: string;
  cid: string;
  format?: string | undefined;
};

export type RenderFn = (input: ImageRequestInput) => Promise<TransformedImage>;

export const createRenderFn = (deps: {
  blobResolver: BlobResolver;
}): RenderFn => {
  return (input) =>
    withSsrfProtection(async () => {
      try {
        if (!isPresetName(input.preset)) {
          throw new BadRequestError(`unknown preset: ${input.preset}`);
        }
        if (!isDid(input.did)) {
          throw new BadRequestError(`invalid did: ${input.did}`);
        }
        if (!isCid(input.cid)) {
          throw new BadRequestError(`invalid cid: ${input.cid}`);
        }
        if (input.format !== undefined && !isOutputFormat(input.format)) {
          throw new BadRequestError(`unsupported format: ${input.format}`);
        }

        const preset = PRESETS[input.preset];
        const format = input.format ?? preset.format;

        const blob = await deps.blobResolver.resolveBlob(input.did, input.cid);
        return await transformImage(blob.bytes, preset, format);
      } catch (error) {
        if (error instanceof AtblobHttpError) {
          throw error;
        }
        throw new BadGatewayError("failed to fetch or transform blob", {
          cause: error,
        });
      }
    });
};
