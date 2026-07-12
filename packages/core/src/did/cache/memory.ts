import type { DidCache } from "@atproto/identity";
import { MemoryCache } from "@atproto/identity";

import type { HealthCheckable, HealthCheckResult } from "../../health.js";

class MemoryDidCache extends MemoryCache implements HealthCheckable {
  checkHealth(): Promise<HealthCheckResult> {
    return Promise.resolve({ status: "ok" });
  }
}

export const createMemoryDidCache = (): DidCache & HealthCheckable =>
  new MemoryDidCache();
