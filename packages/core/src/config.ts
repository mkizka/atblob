import { createConsoleLogger, type Logger } from "./logger.js";

type BaseAtblobConfig = {
  maxBlobSize: number;
  didResolveTimeout: number;
  blobFetchTimeout: number;
  maxConcurrentPerHost: number;
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

export type AtblobConfig =
  NonRequired<RedisAtblobConfig> | NonRequired<InMemoryAtblobConfig>;

export const resolveConfig = (
  config: AtblobConfig = {},
): RedisAtblobConfig | InMemoryAtblobConfig => {
  const base: BaseAtblobConfig = {
    maxBlobSize: config.maxBlobSize ?? 10 * 1024 * 1024,
    didResolveTimeout: config.didResolveTimeout ?? 5000,
    blobFetchTimeout: config.blobFetchTimeout ?? 15000,
    maxConcurrentPerHost: config.maxConcurrentPerHost ?? 4,
    plcDirectoryUrl: config.plcDirectoryUrl ?? "https://plc.directory",
    logger: config.logger ?? createConsoleLogger(),
  };
  if (config.didCache !== "redis") {
    return { ...base, didCache: "memory" };
  }
  const redisUrl = "redisUrl" in config ? config.redisUrl : undefined;
  if (redisUrl === undefined) {
    throw new Error('redisUrl is required when didCache is "redis"');
  }
  return { ...base, didCache: "redis", redisUrl };
};
