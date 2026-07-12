import { createConsoleLogger, type Logger } from "./logger.js";

type BaseAtblobConfig = {
  maxBlobSize: number;
  didResolveTimeout: number;
  blobFetchTimeout: number;
  plcDirectoryUrl: string;
  logger: Logger;
};

type RedisAtblobConfig = BaseAtblobConfig & {
  didCache: "redis";
  redisUrl: string;
};

type InMemoryAtblobConfig = BaseAtblobConfig & {
  didCache: "memory";
};

type NonRequired<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export type AtblobConfig = NonRequired<BaseAtblobConfig> & {
  didCache?: "redis" | "memory" | undefined;
  redisUrl?: string | undefined;
};

export const resolveConfig = (
  config: AtblobConfig = {},
): RedisAtblobConfig | InMemoryAtblobConfig => {
  const base: BaseAtblobConfig = {
    maxBlobSize: config.maxBlobSize ?? 10 * 1024 * 1024,
    didResolveTimeout: config.didResolveTimeout ?? 5000,
    blobFetchTimeout: config.blobFetchTimeout ?? 15000,
    plcDirectoryUrl: config.plcDirectoryUrl ?? "https://plc.directory",
    logger: config.logger ?? createConsoleLogger(),
  };
  if (config.redisUrl !== undefined) {
    return { ...base, didCache: "redis", redisUrl: config.redisUrl };
  }
  if (config.didCache === "redis") {
    throw new Error('redisUrl is required when didCache is "redis"');
  }
  return { ...base, didCache: "memory" };
};
