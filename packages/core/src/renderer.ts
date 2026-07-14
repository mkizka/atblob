import { createRegistry } from "@gyaku/di";

import { createBlobFetcher } from "./blob/fetcher.js";
import { installSsrfProtection } from "./blob/ssrf.js";
import { type AtblobConfig, resolveConfig } from "./config.js";
import { createMemoryDidCache } from "./did/cache/memory.js";
import { createRedisDidCache } from "./did/cache/redis.js";
import { createPdsResolver } from "./did/resolver.js";
import { createCheckHealth, type HealthCheck } from "./health.js";
import { createRenderFn, type RenderFn } from "./render/render.js";

export type Renderer = AsyncDisposable & {
  render: RenderFn;
  checkHealth: HealthCheck;
};

export const createRenderer = async (
  config: AtblobConfig = {},
): Promise<Renderer> => {
  const resolved = resolveConfig(config);

  installSsrfProtection();

  const base = createRegistry()
    .value("maxBlobSize", resolved.maxBlobSize)
    .value("blobFetchTimeout", resolved.blobFetchTimeout)
    .value("maxConcurrentPerHost", resolved.maxConcurrentPerHost)
    .value("plcDirectoryUrl", resolved.plcDirectoryUrl)
    .value("didResolveTimeout", resolved.didResolveTimeout)
    .value("logger", resolved.logger)
    .service(
      "blobFetcher",
      ["maxBlobSize", "blobFetchTimeout", "maxConcurrentPerHost"],
      createBlobFetcher,
    );

  const registry =
    resolved.didCache === "memory"
      ? base.service("didCache", [], createMemoryDidCache)
      : base
          .value("redisUrl", resolved.redisUrl)
          .service("didCache", ["redisUrl", "logger"], createRedisDidCache);

  const services = await registry
    .service(
      "pdsResolver",
      ["plcDirectoryUrl", "didResolveTimeout", "didCache"],
      createPdsResolver,
    )
    .service("render", ["pdsResolver", "blobFetcher"], createRenderFn)
    .service("checkHealth", ["didCache"], createCheckHealth)
    .resolve();

  return {
    render: services.render,
    checkHealth: services.checkHealth,
    [Symbol.asyncDispose]: services[Symbol.asyncDispose],
  };
};
