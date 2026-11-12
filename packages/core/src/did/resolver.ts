import {
  createDidResolver,
  type DidCache,
  DidError,
  extractPdsUrl,
} from "@atproto-labs/did-resolver";

import { BadGatewayError, BadRequestError, NotFoundError } from "../errors.js";
import type { Did } from "./did.js";
import type { DidFetch } from "./fetch.js";

export type PdsResolver = {
  resolvePdsEndpoint: (did: Did) => Promise<URL>;
};

const isNotFound = (cause: unknown): boolean =>
  cause instanceof DidError &&
  (cause.code === "did-service-not-found" ||
    cause.status === 404 ||
    cause.status === 410);

export const createPdsResolver = (deps: {
  plcDirectoryUrl: string;
  didCache: DidCache;
  didFetch: DidFetch;
}): PdsResolver => {
  const resolver = createDidResolver({
    plcDirectoryUrl: deps.plcDirectoryUrl,
    didCache: deps.didCache,
    fetch: deps.didFetch,
  });

  const resolvePdsEndpoint = async (did: Did): Promise<URL> => {
    try {
      const document = await resolver.resolve(did);
      return extractPdsUrl(document);
    } catch (cause) {
      if (cause instanceof DidError && cause.code === "did-invalid") {
        throw new BadRequestError(`invalid did: ${did}`, { cause });
      }
      if (isNotFound(cause)) {
        throw new NotFoundError(`did not found: ${did}`, { cause });
      }
      throw new BadGatewayError(`failed to resolve did: ${did}`, { cause });
    }
  };

  return { resolvePdsEndpoint };
};
