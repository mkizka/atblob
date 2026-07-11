import { createRegistry } from "@gyaku/di";

import { createBlobFetcher } from "./blob/fetcher.js";
import { installSsrfProtection } from "./blob/ssrf.js";
import { type AtblobConfig, resolveConfig } from "./config.js";
import { createMemoryDidCache } from "./did/cache/memory.js";
import { createRedisDidCache } from "./did/cache/redis.js";
import { createPdsResolver } from "./did/resolver.js";
import { createRenderer, type Renderer } from "./render/render.js";

export type Atblob = AsyncDisposable & {
  render: Renderer;
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
    .service(
      "blobFetcher",
      ["maxBlobSize", "blobFetchTimeout"],
      createBlobFetcher,
    );

  const registry =
    resolved.didCache === "memory"
      ? base.service("didCache", [], createMemoryDidCache)
      : base
          .value("redisUrl", resolved.redisUrl)
          .service("didCache", ["redisUrl"], createRedisDidCache);

  const services = await registry
    .service(
      "pdsResolver",
      ["plcDirectoryUrl", "didResolveTimeout", "didCache"],
      createPdsResolver,
    )
    .service("render", ["pdsResolver", "blobFetcher"], createRenderer)
    .resolve();

  resolved.logger.info("atblob server started");

  return {
    render: services.render,
    [Symbol.asyncDispose]: async () => {
      await services[Symbol.asyncDispose]();
      resolved.logger.info("atblob server stopped");
    },
  };
};
