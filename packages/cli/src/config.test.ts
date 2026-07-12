import { afterEach, describe, expect, it, vi } from "vitest";

import { buildConfig, type Env } from "./config.js";

describe("buildConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reflects CLI argument values in the config", () => {
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

  it("uses environment variable values when no CLI arguments are given", () => {
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

  it("CLI arguments take precedence over environment variables", () => {
    const config = buildConfig(
      { didCache: "memory", port: 8080 },
      { PORT: "9000" },
    );

    expect(config.port).toBe(8080);
  });

  it("defaults to 3000 when port is not specified", () => {
    const config = buildConfig({ didCache: "memory" }, {});

    expect(config.port).toBe(3000);
  });

  it("creates a logger that does not output below info (debug) when logLevel is not specified", () => {
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

  it("throws when logLevel is an invalid value", () => {
    expect(() =>
      buildConfig({}, { DID_CACHE: "memory", LOG_LEVEL: "verbose" }),
    ).toThrow(
      "environment variable LOG_LEVEL must be one of: debug, info, warn, error, silent: verbose",
    );
  });

  it("creates a pretty-format logger when logFormat is not specified", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const config = buildConfig({ didCache: "memory" }, {});
    config.logger.info("hello");

    expect(String(spy.mock.calls[0]?.[0])).not.toMatch(/^\{/);
  });

  it("creates a JSON-format logger when logFormat is json", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const config = buildConfig({ didCache: "memory", logFormat: "json" }, {});
    config.logger.info("hello");

    expect(() => {
      JSON.parse(String(spy.mock.calls[0]?.[0]));
    }).not.toThrow();
  });

  it("throws when logFormat is an invalid value", () => {
    expect(() =>
      buildConfig({}, { DID_CACHE: "memory", LOG_FORMAT: "yaml" }),
    ).toThrow(
      "environment variable LOG_FORMAT must be one of: json, pretty: yaml",
    );
  });

  it("throws when an environment variable value is not a valid number", () => {
    expect(() => buildConfig({}, { PORT: "not-a-number" })).toThrow(
      "environment variable PORT must be a number: not-a-number",
    );
  });

  it("throws when didCache is not specified and redisUrl is also missing", () => {
    expect(() => buildConfig({}, {})).toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });

  it("throws when didCache is redis and redisUrl is missing", () => {
    expect(() => buildConfig({ didCache: "redis" }, {})).toThrow(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  });

  it("does not throw when didCache is memory even without redisUrl", () => {
    expect(() => buildConfig({ didCache: "memory" }, {})).not.toThrow();
  });
});
