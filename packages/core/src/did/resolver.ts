import { type DidCache, DidResolver } from "@atproto/identity";

import { NotFoundError } from "../errors.js";
import type { Did } from "./did.js";

export type PdsResolver = {
  resolvePdsEndpoint: (did: Did) => Promise<string>;
};

export const createPdsResolver = (deps: {
  plcDirectoryUrl: string;
  didResolveTimeout: number;
  didCache: DidCache;
}): PdsResolver => {
  const resolver = new DidResolver({
    plcUrl: deps.plcDirectoryUrl,
    timeout: deps.didResolveTimeout,
    didCache: deps.didCache,
  });

  const resolvePdsEndpoint = async (did: Did): Promise<string> => {
    try {
      const { pds } = await resolver.resolveAtprotoData(did);
      return pds;
    } catch (cause) {
      throw new NotFoundError(`failed to resolve did: ${did}`, { cause });
    }
  };

  return { resolvePdsEndpoint };
};
