import { describe, expect, it } from "vitest";

import { resolveConfig } from "./config.js";
import { createNoopLogger } from "./logger.js";

describe("resolveConfig", () => {
  it("didCacheがmemoryの場合はデフォルト値を含めて設定を構築する", () => {
    const config = resolveConfig({ didCache: "memory" });

    expect(config).toMatchObject({
      didCache: "memory",
      maxBlobSize: 10 * 1024 * 1024,
      didResolveTimeout: 5000,
      blobFetchTimeout: 15000,
      plcDirectoryUrl: "https://plc.directory",
    });
    expect(config.logger).toBeDefined();
  });

  it("didCacheがredisの場合はredisUrlを含めて設定を構築する", () => {
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
      plcDirectoryUrl: "https://plc.directory",
    });
    expect(config.logger).toBeDefined();
  });

  it("指定した値がデフォルト値より優先される", () => {
    const logger = createNoopLogger();
    const config = resolveConfig({
      didCache: "memory",
      maxBlobSize: 1024,
      didResolveTimeout: 100,
      blobFetchTimeout: 200,
      plcDirectoryUrl: "https://plc.example.com",
      logger,
    });

    expect(config).toEqual({
      didCache: "memory",
      maxBlobSize: 1024,
      didResolveTimeout: 100,
      blobFetchTimeout: 200,
      plcDirectoryUrl: "https://plc.example.com",
      logger,
    });
  });

  it("didCacheがredisでredisUrlが無い場合はエラーになる", () => {
    expect(() => resolveConfig({ didCache: "redis" })).toThrow(
      'redisUrl is required when didCache is "redis"',
    );
  });

  it("configを省略した場合はredisUrlが無いためエラーになる", () => {
    expect(() => resolveConfig()).toThrow(
      'redisUrl is required when didCache is "redis"',
    );
  });
});
