import type { Did } from "../did/did.js";
import type { PdsResolver } from "../did/resolver.js";
import type { BlobCache } from "./cache/cache.js";
import type { BlobFetcher, FetchedBlob } from "./fetcher.js";

export type BlobResolver = {
  resolveBlob: (did: Did, cid: string) => Promise<FetchedBlob>;
};

export const createBlobResolver = (deps: {
  pdsResolver: PdsResolver;
  blobFetcher: BlobFetcher;
  blobCache: BlobCache;
}): BlobResolver => {
  const resolveBlob = async (did: Did, cid: string): Promise<FetchedBlob> => {
    const cached = await deps.blobCache.get(did, cid);
    if (cached) {
      return cached;
    }
    const pdsEndpoint = await deps.pdsResolver.resolvePdsEndpoint(did);
    const blob = await deps.blobFetcher.fetchBlob(pdsEndpoint, did, cid);
    await deps.blobCache.set(did, cid, blob);
    return blob;
  };

  return { resolveBlob };
};
