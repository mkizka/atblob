import { createRegistry } from "@gyaku/di";

import { createBlobFetcher } from "./blob/fetcher.js";
import { installSsrfProtection } from "./blob/ssrf.js";
import { type AtblobConfig, resolveConfig } from "./config.js";
import { createMemoryDidCache } from "./did/cache/memory.js";
import { createRedisDidCache } from "./did/cache/redis.js";
import { createPdsResolver } from "./did/resolver.js";
import {
  type HealthCheck,
  type HealthCheckResult,
  runHealthChecks,
} from "./health.js";
import { createRenderer, type Renderer } from "./render/render.js";

export type Atblob = AsyncDisposable & {
  render: Renderer;
  checkHealth: () => Promise<HealthCheckResult>;
};

export const createAtblob = async (
  config: AtblobConfig = {},
): Promise<Atblob> => {
  const resolved = resolveConfig(config);

  installSsrfProtection();

  const base = createRegistry()
    .value("maxBlobSize", resolved.maxBlobSize)
    .value("blobFetchTimeout", resolved.blobFetchTimeout)
    .value("plcDirectoryUrl", resolved.plcDirectoryUrl)
    .value("didResolveTimeout", resolved.didResolveTimeout)
    .value("logger", resolved.logger)
    .service(
      "blobFetcher",
      ["maxBlobSize", "blobFetchTimeout"],
      createBlobFetcher,
    );

  const registry =
    resolved.didCache === "memory"
      ? base
          .service("didCache", [], createMemoryDidCache)
          .value("healthChecks", {})
      : base
          .value("redisUrl", resolved.redisUrl)
          .service("didCache", ["redisUrl", "logger"], createRedisDidCache)
          .service(
            "healthChecks",
            ["didCache"],
            (deps): Record<string, HealthCheck> => ({
              redis: deps.didCache.checkHealth,
            }),
          );

  const services = await registry
    .service(
      "pdsResolver",
      ["plcDirectoryUrl", "didResolveTimeout", "didCache"],
      createPdsResolver,
    )
    .service("render", ["pdsResolver", "blobFetcher"], createRenderer)
    .service(
      "checkHealth",
      ["healthChecks"],
      (deps) => () => runHealthChecks(deps.healthChecks),
    )
    .resolve();

  return {
    render: services.render,
    checkHealth: services.checkHealth,
    [Symbol.asyncDispose]: services[Symbol.asyncDispose],
  };
};
