export type DidCacheBackend = "redis" | "memory";

export type AtcdnConfig = {
  didCache?: DidCacheBackend;
  redisUrl?: string;
  maxBlobSize?: number;
  didResolveTimeout?: number;
  blobFetchTimeout?: number;
  plcDirectoryUrl?: string;
};

export type ResolvedAtcdnConfig = Required<AtcdnConfig>;

export const DEFAULT_CONFIG: ResolvedAtcdnConfig = {
  didCache: "redis",
  redisUrl: "redis://localhost:6379",
  maxBlobSize: 10 * 1024 * 1024,
  didResolveTimeout: 5000,
  blobFetchTimeout: 15000,
  plcDirectoryUrl: "https://plc.directory",
};

export const resolveConfig = (
  config: AtcdnConfig = {},
): ResolvedAtcdnConfig => ({
  ...DEFAULT_CONFIG,
  ...config,
});
