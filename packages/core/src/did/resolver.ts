import {
  createDidResolver,
  type DidCache,
  extractPdsUrl,
} from "@atproto-labs/did-resolver";

import type { SafeFetch } from "../blob/ssrf.js";
import { NotFoundError } from "../errors.js";
import type { Did } from "./did.js";

export type PdsResolver = {
  resolvePdsEndpoint: (did: Did) => Promise<string>;
};

export const createPdsResolver = (deps: {
  plcDirectoryUrl: string;
  didCache: DidCache;
  didFetch?: SafeFetch;
}): PdsResolver => {
  const resolver = createDidResolver({
    plcDirectoryUrl: deps.plcDirectoryUrl,
    didCache: deps.didCache,
    ...(deps.didFetch !== undefined && { fetch: deps.didFetch }),
  });

  const resolvePdsEndpoint = async (did: Did): Promise<string> => {
    try {
      const document = await resolver.resolve(did);
      return extractPdsUrl(document).toString();
    } catch (cause) {
      throw new NotFoundError(`failed to resolve did: ${did}`, { cause });
    }
  };

  return { resolvePdsEndpoint };
};
