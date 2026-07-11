type BaseAtcdnConfig = {
  maxBlobSize: number;
  didResolveTimeout: number;
  blobFetchTimeout: number;
  plcDirectoryUrl: string;
};

type RedisAtcdnConfig = BaseAtcdnConfig & {
  didCache: "redis";
  redisUrl: string;
};

type InMemoryAtcdnConfig = BaseAtcdnConfig & {
  didCache: "memory";
};

type NonRequired<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export type AtcdnConfig =
  NonRequired<RedisAtcdnConfig> | NonRequired<InMemoryAtcdnConfig>;

export const resolveConfig = (
  config: AtcdnConfig = {},
): RedisAtcdnConfig | InMemoryAtcdnConfig => {
  const base: BaseAtcdnConfig = {
    maxBlobSize: config.maxBlobSize ?? 10 * 1024 * 1024,
    didResolveTimeout: config.didResolveTimeout ?? 5000,
    blobFetchTimeout: config.blobFetchTimeout ?? 15000,
    plcDirectoryUrl: config.plcDirectoryUrl ?? "https://plc.directory",
  };
  if (config.didCache === "memory") {
    return { ...base, didCache: "memory" };
  }
  const redisUrl = "redisUrl" in config ? config.redisUrl : undefined;
  if (redisUrl === undefined) {
    throw new Error('redisUrl is required when didCache is "redis"');
  }
  return { ...base, didCache: "redis", redisUrl };
};
