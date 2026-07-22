import type { Did, DidDocument } from "@atproto-labs/did-resolver";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../logger.js";

const { FakeRedis, instances } = vi.hoisted(() => {
  class FakeRedis {
    store = new Map<string, string>();
    pingImpl = (): Promise<string> => Promise.resolve("PONG");
    quit = vi.fn(() => Promise.resolve("OK"));
    get = vi.fn((key: string): Promise<string | null> =>
      Promise.resolve(this.store.get(key) ?? null),
    );
    set = vi.fn((key: string, value: string): Promise<string> => {
      this.store.set(key, value);
      return Promise.resolve("OK");
    });
    del = vi.fn((...keys: string[]): Promise<number> => {
      let deleted = 0;
      for (const key of keys) {
        if (this.store.delete(key)) {
          deleted++;
        }
      }
      return Promise.resolve(deleted);
    });
    scan = vi.fn(
      (
        _cursor: string,
        _matchKeyword: string,
        pattern: string,
      ): Promise<[string, string[]]> => {
        const regex = new RegExp(
          `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\*", ".*")}$`,
        );
        const keys = [...this.store.keys()].filter((key) => regex.test(key));
        return Promise.resolve(["0", keys]);
      },
    );
    ping = vi.fn((): Promise<string> => this.pingImpl());
  }
  const instances: FakeRedis[] = [];
  return { FakeRedis, instances };
});

vi.mock("ioredis", () => ({
  Redis: vi.fn(function (this: InstanceType<typeof FakeRedis>) {
    const instance = new FakeRedis();
    instances.push(instance);
    Object.assign(this, instance);
  }),
}));

const { createRedisDidCache } = await import("./redis.js");

const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";
const OTHER_DID: Did = "did:plc:aaaabbbbccccddddeeeeffff";
const DOC: DidDocument = { id: DID };

const fakeLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const currentInstance = (): InstanceType<typeof FakeRedis> => {
  const instance = instances.at(-1);
  if (!instance) {
    throw new Error("no FakeRedis instance was constructed");
  }
  return instance;
};

beforeEach(() => {
  instances.length = 0;
});

describe("createRedisDidCache", () => {
  it("returns undefined when the did is not cached", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });

    await expect(cache.get(DID)).resolves.toBeUndefined();
  });

  it("round-trips a cached did document through get/set", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });

    await cache.set(DID, DOC);

    await expect(cache.get(DID)).resolves.toEqual(DOC);
    expect(currentInstance().set).toHaveBeenCalledWith(
      `atblob:did:${DID}`,
      JSON.stringify(DOC),
      "PX",
      expect.any(Number),
    );
  });

  it("returns undefined for a cached value that is not a did document", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });
    await currentInstance().set(`atblob:did:${DID}`, JSON.stringify(null));

    await expect(cache.get(DID)).resolves.toBeUndefined();
  });

  it("deletes a cached did document", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });
    await cache.set(DID, DOC);

    await cache.del(DID);

    await expect(cache.get(DID)).resolves.toBeUndefined();
  });

  it("clears only atblob-prefixed keys", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });
    await cache.set(DID, DOC);
    await cache.set(OTHER_DID, { id: OTHER_DID });
    await currentInstance().set("unrelated:key", "keep me");

    await cache.clear?.();

    await expect(cache.get(DID)).resolves.toBeUndefined();
    await expect(cache.get(OTHER_DID)).resolves.toBeUndefined();
    expect(currentInstance().store.get("unrelated:key")).toBe("keep me");
  });

  it("reports ok health when redis responds to ping", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });

    await expect(cache.checkHealth()).resolves.toEqual({ status: "ok" });
  });

  it("reports error health when the ping fails", async () => {
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger: fakeLogger(),
    });
    currentInstance().pingImpl = () => Promise.reject(new Error("down"));

    await expect(cache.checkHealth()).resolves.toEqual({
      status: "error",
      error: "down",
    });
  });

  it("quits the connection and logs on dispose", async () => {
    const logger = fakeLogger();
    const cache = createRedisDidCache({
      redisUrl: "redis://localhost:6379",
      logger,
    });

    await cache[Symbol.asyncDispose]();

    expect(currentInstance().quit).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("redis did cache disconnected");
  });
});
