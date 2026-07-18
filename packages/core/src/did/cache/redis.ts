import type { Did, DidCache, DidDocument } from "@atproto-labs/did-resolver";
import { Redis } from "ioredis";

import type { HealthCheckable } from "../../health.js";
import type { Logger } from "../../logger.js";

const HOUR = 60 * 60 * 1000;
const KEY_PREFIX = "atblob:did:";

interface RedisDidCache extends DidCache, AsyncDisposable, HealthCheckable {}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isDidDocument = (value: unknown): value is DidDocument => {
  return isObject(value) && "id" in value && typeof value["id"] === "string";
};

export const createRedisDidCache = (
  deps: { redisUrl: string; logger: Logger },
  ttlMs = HOUR,
): RedisDidCache => {
  const redis = new Redis(deps.redisUrl, { lazyConnect: true });

  return {
    [Symbol.asyncDispose]: async () => {
      await redis.quit();
      deps.logger.info("redis did cache disconnected");
    },
    checkHealth: async () => {
      try {
        await redis.ping();
        return { status: "ok" };
      } catch (cause) {
        return {
          status: "error",
          error: cause instanceof Error ? cause.message : String(cause),
        };
      }
    },
    get: async (did: Did): Promise<DidDocument | undefined> => {
      const raw = await redis.get(KEY_PREFIX + did);
      if (!raw) {
        return undefined;
      }
      const parsed: unknown = JSON.parse(raw);
      return isDidDocument(parsed) ? parsed : undefined;
    },
    set: async (did: Did, doc: DidDocument): Promise<void> => {
      await redis.set(KEY_PREFIX + did, JSON.stringify(doc), "PX", ttlMs);
    },
    del: async (did: Did): Promise<void> => {
      await redis.del(KEY_PREFIX + did);
    },
    clear: async (): Promise<void> => {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          `${KEY_PREFIX}*`,
          "COUNT",
          100,
        );
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== "0");
    },
  };
};
