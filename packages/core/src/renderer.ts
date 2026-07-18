import { createRegistry } from "@gyaku/di";

import { createMemoryBlobCache } from "./blob/cache/memory.js";
import { createBlobFetcher } from "./blob/fetcher.js";
import { createBlobResolver } from "./blob/resolver.js";
import { createSafeFetch } from "./blob/ssrf.js";
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

  // Each fetch is wrapped independently (rather than mutating undici's
  // global dispatcher) so that host apps embedding @atblob/hono or
  // @atblob/express don't have their own unrelated fetch() calls affected.
  const blobFetch = createSafeFetch({
    timeout: resolved.blobFetchTimeout,
    responseMaxSize: resolved.maxBlobSize,
  });
  const didFetch = createSafeFetch({ timeout: resolved.didResolveTimeout });

  const base = createRegistry()
    .value("maxBlobSize", resolved.maxBlobSize)
    .value("blobFetchTimeout", resolved.blobFetchTimeout)
    .value("blobFetch", blobFetch)
    .value("blobCacheTTL", resolved.blobCacheTTL)
    .value("plcDirectoryUrl", resolved.plcDirectoryUrl)
    .value("didFetch", didFetch)
    .value("logger", resolved.logger)
    .service(
      "blobFetcher",
      ["maxBlobSize", "blobFetchTimeout", "blobFetch"],
      createBlobFetcher,
    )
    .service("blobCache", ["blobCacheTTL"], createMemoryBlobCache);

  const registry =
    resolved.didCache === "memory"
      ? base.service("didCache", [], createMemoryDidCache)
      : base
          .value("redisUrl", resolved.redisUrl)
          .service("didCache", ["redisUrl", "logger"], createRedisDidCache);

  const services = await registry
    .service(
      "pdsResolver",
      ["plcDirectoryUrl", "didFetch", "didCache"],
      createPdsResolver,
    )
    .service(
      "blobResolver",
      ["pdsResolver", "blobFetcher", "blobCache"],
      createBlobResolver,
    )
    .service("render", ["blobResolver"], createRenderFn)
    .service("checkHealth", ["didCache"], createCheckHealth)
    .resolve();

  return {
    render: services.render,
    checkHealth: services.checkHealth,
    [Symbol.asyncDispose]: services[Symbol.asyncDispose],
  };
};
