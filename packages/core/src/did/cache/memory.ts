import { type DidCache, DidCacheMemory } from "@atproto-labs/did-resolver";

import type { HealthCheckable, HealthCheckResult } from "../../health.js";

class MemoryDidCache extends DidCacheMemory implements HealthCheckable {
  checkHealth(): Promise<HealthCheckResult> {
    return Promise.resolve({ status: "ok" });
  }
}

export const createMemoryDidCache = (): DidCache & HealthCheckable =>
  new MemoryDidCache();
