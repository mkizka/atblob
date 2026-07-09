import type { DidCache } from "@atproto/identity";
import { MemoryCache } from "@atproto/identity";

export const createMemoryDidCache = (): DidCache => new MemoryCache();
