import { isCid } from "../blob/cid.js";
import type { BlobFetcher } from "../blob/fetcher.js";
import { isDid } from "../did/did.js";
import type { PdsResolver } from "../did/resolver.js";
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
  pdsResolver: PdsResolver;
  blobFetcher: BlobFetcher;
}): RenderFn => {
  return async (input) => {
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

      const pdsEndpoint = await deps.pdsResolver.resolvePdsEndpoint(input.did);
      const blob = await deps.blobFetcher.fetchBlob(
        pdsEndpoint,
        input.did,
        input.cid,
      );
      return await transformImage(blob.bytes, preset, format);
    } catch (error) {
      if (error instanceof AtblobHttpError) {
        throw error;
      }
      throw new BadGatewayError("failed to fetch or transform blob", {
        cause: error,
      });
    }
  };
};
