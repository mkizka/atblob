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
import { transformImage } from "../image/transform.js";
import type { Logger } from "../logger.js";

export type ImageRequestInput = {
  preset: string;
  did: string;
  cid: string;
  format?: string | undefined;
};

export type RenderResult = {
  bytes: Uint8Array;
  headers: Record<string, string>;
};

export type Renderer = (input: ImageRequestInput) => Promise<RenderResult>;

export const createRenderer = (deps: {
  pdsResolver: PdsResolver;
  blobFetcher: BlobFetcher;
  logger: Logger;
}): Renderer => {
  return async (input) => {
    deps.logger.debug("image request received", {
      preset: input.preset,
      did: input.did,
      cid: input.cid,
      format: input.format,
    });
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
      const image = await transformImage(blob.bytes, preset, format);

      deps.logger.info("image request completed", {
        preset: input.preset,
        did: input.did,
        cid: input.cid,
        format,
        size: image.bytes.byteLength,
      });

      return {
        bytes: image.bytes,
        headers: {
          "Cache-Control": "public, max-age=31536000",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Content-Type": image.contentType,
        },
      };
    } catch (error) {
      const fields = {
        preset: input.preset,
        did: input.did,
        cid: input.cid,
        error,
      };
      if (error instanceof AtblobHttpError) {
        if (error.status >= 500) {
          deps.logger.error("image request failed", fields);
        } else {
          deps.logger.warn("image request failed", fields);
        }
        throw error;
      }
      deps.logger.error("image request failed", fields);
      throw new BadGatewayError("failed to fetch or transform blob", {
        cause: error,
      });
    }
  };
};
