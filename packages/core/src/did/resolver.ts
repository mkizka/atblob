import {
  createDidResolver,
  type DidCache,
  extractPdsUrl,
} from "@atproto-labs/did-resolver";

import { NotFoundError } from "../errors.js";
import type { Did } from "./did.js";

export type PdsResolver = {
  resolvePdsEndpoint: (did: Did) => Promise<URL>;
};

export type DidFetch = typeof fetch;

export const createDidFetch = (deps: {
  didResolveTimeout: number;
}): DidFetch => {
  return (input, init) =>
    fetch(input, {
      ...init,
      signal: AbortSignal.timeout(deps.didResolveTimeout),
    });
};

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
      throw new NotFoundError(`failed to resolve did: ${did}`, { cause });
    }
  };

  return { resolvePdsEndpoint };
};
