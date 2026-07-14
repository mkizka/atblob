import { describe, expect, it } from "vitest";

import { resolveConfig } from "./config.js";
import { createNoopLogger } from "./logger.js";

describe("resolveConfig", () => {
  it("builds a config including redisUrl when didCache is redis", () => {
    const config = resolveConfig({
      didCache: "redis",
      redisUrl: "redis://localhost:6379",
    });

    expect(config).toMatchObject({
      didCache: "redis",
      redisUrl: "redis://localhost:6379",
      maxBlobSize: 10 * 1024 * 1024,
      didResolveTimeout: 5000,
      blobFetchTimeout: 15000,
      blobCacheTTL: 5 * 60 * 1000,
      plcDirectoryUrl: "https://plc.directory",
    });
    expect(config.logger).toBeDefined();
  });

  it("specified values take precedence over default values", () => {
    const logger = createNoopLogger();
    const config = resolveConfig({
      didCache: "memory",
      maxBlobSize: 1024,
      didResolveTimeout: 100,
      blobFetchTimeout: 200,
      blobCacheTTL: 300,
      plcDirectoryUrl: "https://plc.example.com",
      logger,
    });

    expect(config).toEqual({
      didCache: "memory",
      maxBlobSize: 1024,
      didResolveTimeout: 100,
      blobFetchTimeout: 200,
      blobCacheTTL: 300,
      plcDirectoryUrl: "https://plc.example.com",
      logger,
    });
  });

  it("throws when didCache is redis and redisUrl is missing", () => {
    expect(() => resolveConfig({ didCache: "redis" })).toThrow(
      'redisUrl is required when didCache is "redis"',
    );
  });

  it("defaults to memory when config is omitted", () => {
    const config = resolveConfig();

    expect(config).toMatchObject({
      didCache: "memory",
      maxBlobSize: 10 * 1024 * 1024,
      didResolveTimeout: 5000,
      blobFetchTimeout: 15000,
      blobCacheTTL: 5 * 60 * 1000,
      plcDirectoryUrl: "https://plc.directory",
    });
    expect(config.logger).toBeDefined();
  });
});
