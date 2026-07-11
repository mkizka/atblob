export type DidCacheBackend = "redis" | "memory";

export type ResolvedAtcdnConfig = {
  didCache: DidCacheBackend;
  redisUrl: string;
  maxBlobSize: number;
  didResolveTimeout: number;
  blobFetchTimeout: number;
  plcDirectoryUrl: string;
};

export type AtcdnConfig = {
  [K in keyof ResolvedAtcdnConfig]?: ResolvedAtcdnConfig[K] | undefined;
};

export const resolveConfig = (
  config: AtcdnConfig = {},
): ResolvedAtcdnConfig => {
  const didCache = config.didCache ?? "redis";
  if (didCache === "redis" && config.redisUrl === undefined) {
    throw new Error('redisUrl is required when didCache is "redis"');
  }
  return {
    didCache,
    redisUrl: config.redisUrl ?? "",
    maxBlobSize: config.maxBlobSize ?? 10 * 1024 * 1024,
    didResolveTimeout: config.didResolveTimeout ?? 5000,
    blobFetchTimeout: config.blobFetchTimeout ?? 15000,
    plcDirectoryUrl: config.plcDirectoryUrl ?? "https://plc.directory",
  };
};
