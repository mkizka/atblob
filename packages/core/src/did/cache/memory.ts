import type { DidCache } from "@atproto/identity";
import { MemoryCache } from "@atproto/identity";

import type { HealthCheckable } from "../../health.js";

class MemoryDidCache extends MemoryCache implements HealthCheckable {
  checkHealth(): Promise<void> {
    return Promise.resolve();
  }
}

export const createMemoryDidCache = (): DidCache & HealthCheckable =>
  new MemoryDidCache();
