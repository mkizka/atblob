import { afterEach, describe, expect, it, vi } from "vitest";

import { buildConfig, type Env } from "./config.js";

describe("buildConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CLI引数の値を設定に反映する", () => {
    const config = buildConfig(
      {
        didCache: "memory",
        maxBlobSize: 1024,
        didResolveTimeout: 100,
        blobFetchTimeout: 200,
        plcDirectoryUrl: "https://plc.example.com",
        port: 8080,
        logLevel: "debug",
      },
      {},
    );

    expect(config).toMatchObject({
      didCache: "memory",
      redisUrl: undefined,
      maxBlobSize: 1024,
      didResolveTimeout: 100,
      blobFetchTimeout: 200,
      plcDirectoryUrl: "https://plc.example.com",
      port: 8080,
    });
    expect(config.logger).toBeDefined();
  });

  it("CLI引数が無い場合は環境変数の値を使う", () => {
    const env: Env = {
      DID_CACHE: "redis",
      REDIS_URL: "redis://localhost:6379",
      MAX_BLOB_SIZE: "2048",
      DID_RESOLVE_TIMEOUT: "300",
      BLOB_FETCH_TIMEOUT: "400",
      PLC_DIRECTORY_URL: "https://plc.example.com",
      PORT: "9000",
      LOG_LEVEL: "warn",
    };

    const config = buildConfig({}, env);

    expect(config).toMatchObject({
      didCache: "redis",
      redisUrl: "redis://localhost:6379",
      maxBlobSize: 2048,
      didResolveTimeout: 300,
      blobFetchTimeout: 400,
      plcDirectoryUrl: "https://plc.example.com",
      port: 9000,
    });
    expect(config.logger).toBeDefined();
  });

  it("CLI引数が環境変数より優先される", () => {
    const config = buildConfig(
      { didCache: "memory", port: 8080 },
      { PORT: "9000" },
    );

    expect(config.port).toBe(8080);
  });

  it("portを指定しない場合は3000がデフォルトになる", () => {
    const config = buildConfig({ didCache: "memory" }, {});

    expect(config.port).toBe(3000);
  });

  it("logLevelを指定しない場合はinfo未満(debug)を出力しないロガーになる", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);

    const config = buildConfig({ didCache: "memory" }, {});
    config.logger.debug("hidden");
    config.logger.info("shown");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it("logLevelが不正な値の場合はエラーになる", () => {
    expect(() =>
      buildConfig({}, { DID_CACHE: "memory", LOG_LEVEL: "verbose" }),
    ).toThrow(
      "environment variable LOG_LEVEL must be one of: debug, info, warn, error, silent: verbose",
    );
  });

  it("環境変数の値が数値として不正な場合はエラーになる", () => {
    expect(() => buildConfig({}, { PORT: "not-a-number" })).toThrow(
      "environment variable PORT must be a number: not-a-number",
    );
  });

  it("didCacheを指定せずredisUrlも無い場合はエラーになる", () => {
    expect(() => buildConfig({}, {})).toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });

  it("didCacheがredisでredisUrlが無い場合はエラーになる", () => {
    expect(() => buildConfig({ didCache: "redis" }, {})).toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });

  it("didCacheがmemoryの場合はredisUrlが無くてもエラーにならない", () => {
    expect(() => buildConfig({ didCache: "memory" }, {})).not.toThrow();
  });
});
