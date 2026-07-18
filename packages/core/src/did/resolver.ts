import { type DidCache } from "@atproto/identity";

import { NotFoundError } from "../errors.js";
import type { Did } from "./did.js";
import { ScopedDidResolver } from "./scoped-did-resolver.js";

export type PdsResolver = {
  resolvePdsEndpoint: (did: Did) => Promise<string>;
};

export const createPdsResolver = (deps: {
  plcDirectoryUrl: string;
  didResolveTimeout: number;
  didCache: DidCache;
  fetch: typeof fetch;
}): PdsResolver => {
  const resolver = new ScopedDidResolver(
    {
      plcUrl: deps.plcDirectoryUrl,
      timeout: deps.didResolveTimeout,
      didCache: deps.didCache,
    },
    deps.fetch,
  );

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
