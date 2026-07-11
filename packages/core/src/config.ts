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
): ResolvedAtcdnConfig => ({
  didCache: config.didCache ?? "redis",
  redisUrl: config.redisUrl ?? "redis://localhost:6379",
  maxBlobSize: config.maxBlobSize ?? 10 * 1024 * 1024,
  didResolveTimeout: config.didResolveTimeout ?? 5000,
  blobFetchTimeout: config.blobFetchTimeout ?? 15000,
  plcDirectoryUrl: config.plcDirectoryUrl ?? "https://plc.directory",
});
