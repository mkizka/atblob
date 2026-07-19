import type { Did } from "../did/did.js";
import { BadGatewayError, BadRequestError, NotFoundError } from "../errors.js";
import { verifyCid } from "./cid.js";
import type { SafeFetch } from "./ssrf.js";

export type FetchedBlob = {
  bytes: Uint8Array;
  contentType: string;
};

export type BlobFetcher = {
  fetchBlob: (pdsEndpoint: URL, did: Did, cid: string) => Promise<FetchedBlob>;
};

const readBodyWithLimit = async (
  response: Response,
  maxBytes: number,
): Promise<Buffer> => {
  if (!response.body) {
    return Buffer.alloc(0);
  }
  const reader: ReadableStreamDefaultReader<Uint8Array> =
    response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        throw new BadRequestError(`blob exceeds max size of ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks, total);
};

export const createBlobFetcher = (deps: {
  maxBlobSize: number;
  blobFetchTimeout: number;
  blobFetch: SafeFetch;
}): BlobFetcher => {
  const fetchBlob = async (
    pdsEndpoint: URL,
    did: Did,
    cid: string,
  ): Promise<FetchedBlob> => {
    const url = new URL("/xrpc/com.atproto.sync.getBlob", pdsEndpoint);
    url.searchParams.set("did", did);
    url.searchParams.set("cid", cid);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, deps.blobFetchTimeout);

    try {
      let response: Response;
      try {
        response = await deps.blobFetch(url, {
          signal: controller.signal,
          redirect: "follow",
        });
      } catch (cause) {
        throw new BadGatewayError(
          `failed to fetch blob from pds: ${pdsEndpoint.href}`,
          {
            cause,
          },
        );
      }

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new NotFoundError(`blob not found: did=${did} cid=${cid}`);
        }
        throw new BadGatewayError(
          `upstream error fetching blob: status=${response.status}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        throw new BadRequestError(
          `blob is not an image: content-type=${contentType}`,
        );
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength !== null && Number(contentLength) > deps.maxBlobSize) {
        throw new BadRequestError(
          `blob exceeds max size of ${deps.maxBlobSize} bytes`,
        );
      }

      let bytes: Buffer;
      try {
        bytes = await readBodyWithLimit(response, deps.maxBlobSize);
      } catch (cause) {
        if (controller.signal.aborted) {
          throw new BadGatewayError(
            `timed out reading blob body from pds: ${pdsEndpoint.href}`,
            { cause },
          );
        }
        throw cause;
      }
      await verifyCid(cid, bytes);

      return { bytes, contentType };
    } finally {
      clearTimeout(timer);
    }
  };

  return { fetchBlob };
};
