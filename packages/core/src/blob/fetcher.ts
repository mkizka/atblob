import type { Did } from "../did/did.js";
import { BadGatewayError, BadRequestError, NotFoundError } from "../errors.js";
import { verifyCid } from "./cid.js";

export type FetchedBlob = {
  bytes: Uint8Array;
  contentType: string;
};

export type BlobFetcher = {
  fetchBlob: (
    pdsEndpoint: string,
    did: Did,
    cid: string,
  ) => Promise<FetchedBlob>;
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
  fetch: typeof fetch;
}): BlobFetcher => {
  const fetchBlob = async (
    pdsEndpoint: string,
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

    let response: Response;
    try {
      response = await deps.fetch(url, {
        signal: controller.signal,
        redirect: "error",
      });
    } catch (cause) {
      throw new BadGatewayError(
        `failed to fetch blob from pds: ${pdsEndpoint}`,
        {
          cause,
        },
      );
    } finally {
      clearTimeout(timer);
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

    const bytes = await readBodyWithLimit(response, deps.maxBlobSize);
    await verifyCid(cid, bytes);

    return { bytes, contentType };
  };

  return { fetchBlob };
};
