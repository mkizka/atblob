import { createRegistry } from "@gyaku/di";

import { createBlobFetcher } from "./blob/fetcher.js";
import { installSsrfProtection } from "./blob/ssrf.js";
import { type AtcdnConfig, resolveConfig } from "./config.js";
import { createMemoryDidCache } from "./did/cache/memory.js";
import { createRedisDidCache } from "./did/cache/redis.js";
import { createPdsResolver } from "./did/resolver.js";
import { createRenderer, type Renderer } from "./render/render.js";

export type Atcdn = AsyncDisposable & {
  render: Renderer;
};

export const createAtcdn = async (config: AtcdnConfig = {}): Promise<Atcdn> => {
  const resolved = resolveConfig(config);

  installSsrfProtection();

  let registry = createRegistry()
    .value("redisUrl", resolved.redisUrl)
    .value("maxBlobSize", resolved.maxBlobSize)
    .value("blobFetchTimeout", resolved.blobFetchTimeout)
    .value("plcDirectoryUrl", resolved.plcDirectoryUrl)
    .value("didResolveTimeout", resolved.didResolveTimeout)
    .service(
      "blobFetcher",
      ["maxBlobSize", "blobFetchTimeout"],
      createBlobFetcher,
    )
    .service("didCache", ["redisUrl"], createRedisDidCache);

  if (resolved.didCache === "memory") {
    registry = registry.replaceService("didCache", createMemoryDidCache);
  }

  const services = await registry
    .service(
      "pdsResolver",
      ["plcDirectoryUrl", "didResolveTimeout", "didCache"],
      createPdsResolver,
    )
    .service("render", ["pdsResolver", "blobFetcher"], createRenderer)
    .resolve();

  return {
    render: services.render,
    [Symbol.asyncDispose]: services[Symbol.asyncDispose],
  };
};
