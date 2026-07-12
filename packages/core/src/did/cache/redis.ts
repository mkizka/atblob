import type { CacheResult, DidCache, DidDocument } from "@atproto/identity";
import { Redis } from "ioredis";

import type { HealthCheck } from "../../health.js";
import type { Logger } from "../../logger.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const KEY_PREFIX = "atblob:did:";

type CacheEntry = { doc: DidDocument; updatedAt: number };

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isCacheEntry = (value: unknown): value is CacheEntry => {
  if (!isObject(value)) {
    return false;
  }
  if (!("doc" in value) || !("updatedAt" in value)) {
    return false;
  }
  return typeof value["updatedAt"] === "number" && isObject(value["doc"]);
};

const parseCacheEntry = (raw: string): CacheEntry | null => {
  const value: unknown = JSON.parse(raw);
  return isCacheEntry(value) ? value : null;
};

export const createRedisDidCache = (
  deps: { redisUrl: string; logger: Logger },
  staleTTL = HOUR,
  maxTTL = DAY,
): DidCache & AsyncDisposable & { checkHealth: HealthCheck } => {
  const redis = new Redis(deps.redisUrl, { lazyConnect: true });

  const cacheDid = async (did: string, doc: DidDocument): Promise<void> => {
    const entry: CacheEntry = { doc, updatedAt: Date.now() };
    await redis.set(KEY_PREFIX + did, JSON.stringify(entry), "PX", maxTTL);
  };

  const cache: DidCache & AsyncDisposable & { checkHealth: HealthCheck } = {
    [Symbol.asyncDispose]: async () => {
      await redis.quit();
      deps.logger.info("redis did cache disconnected");
    },
    checkHealth: async () => {
      await redis.ping();
    },
    cacheDid,
    refreshCache: async (did, getDoc) => {
      const doc = await getDoc();
      if (doc) {
        await cacheDid(did, doc);
      }
    },
    checkCache: async (did): Promise<CacheResult | null> => {
      const raw = await redis.get(KEY_PREFIX + did);
      if (!raw) {
        return null;
      }
      const entry = parseCacheEntry(raw);
      if (!entry) {
        return null;
      }
      const now = Date.now();
      return {
        did,
        doc: entry.doc,
        updatedAt: entry.updatedAt,
        stale: now > entry.updatedAt + staleTTL,
        expired: now > entry.updatedAt + maxTTL,
      };
    },
    clearEntry: async (did) => {
      await redis.del(KEY_PREFIX + did);
    },
    clear: async () => {
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

  return cache;
};
