#!/usr/bin/env node

import events from "node:events";

import { type AtcdnConfig, createAtcdnApp } from "@atcdn/hono";
import { serve } from "@hono/node-server";
import { cli, define } from "gunshi";
import * as v from "valibot";

import pkg from "../package.json" with { type: "json" };

type AtcdnCliConfig = AtcdnConfig & {
  port: number;
};

const DID_CACHE_CHOICES = ["memory", "redis"] as const;

const numberSchema = v.pipe(
  v.string(),
  v.transform(Number),
  v.check((value) => !Number.isNaN(value), "must be a number"),
);

const didCacheSchema = v.picklist(
  DID_CACHE_CHOICES,
  `must be one of: ${DID_CACHE_CHOICES.join(", ")}`,
);

const stringSchema = v.string();

function env<T>(
  envName: string,
  schema: v.GenericSchema<string, T>,
): T | undefined;
function env<T>(
  envName: string,
  schema: v.GenericSchema<string, T>,
  defaultValue: T,
): T;
function env<T>(
  envName: string,
  schema: v.GenericSchema<string, T>,
  defaultValue?: T,
): T | undefined {
  const raw = process.env[envName];
  if (raw === undefined) {
    return defaultValue;
  }
  const result = v.safeParse(schema, raw);
  if (!result.success) {
    throw new Error(
      `environment variable ${envName} ${result.issues[0].message}: ${raw}`,
    );
  }
  return result.output;
}

const command = define({
  name: "atcdn",
  description: "Start a cdn.bsky.app-compatible image CDN server",
  toKebab: true,
  args: {
    didCache: {
      type: "enum",
      choices: DID_CACHE_CHOICES,
      description: "Where to cache DID resolution results",
    },
    redisUrl: {
      type: "string",
      description: "Redis URL used for the DID cache",
    },
    maxBlobSize: {
      type: "number",
      description: "Maximum allowed blob size (bytes)",
    },
    didResolveTimeout: {
      type: "number",
      description: "DID resolution timeout (milliseconds)",
    },
    blobFetchTimeout: {
      type: "number",
      description: "Blob fetch timeout (milliseconds)",
    },
    plcDirectoryUrl: {
      type: "string",
      description: "PLC Directory URL",
    },
    port: {
      type: "number",
      short: "p",
      description: "Port number the server listens on",
    },
  },
  run: async (ctx) => {
    // prettier-ignore
    const config  = {
      didCache: ctx.values.didCache ?? env("DID_CACHE", didCacheSchema),
      redisUrl: ctx.values.redisUrl ?? env("REDIS_URL", stringSchema),
      maxBlobSize: ctx.values.maxBlobSize ?? env("MAX_BLOB_SIZE", numberSchema),
      didResolveTimeout: ctx.values.didResolveTimeout ?? env("DID_RESOLVE_TIMEOUT", numberSchema),
      blobFetchTimeout: ctx.values.blobFetchTimeout ?? env("BLOB_FETCH_TIMEOUT", numberSchema),
      plcDirectoryUrl: ctx.values.plcDirectoryUrl ?? env("PLC_DIRECTORY_URL", stringSchema),
      port: ctx.values.port ?? env("PORT", numberSchema, 3000),
    } satisfies AtcdnCliConfig;

    if (
      (!config.didCache || config.didCache === "redis") &&
      config.redisUrl === undefined
    ) {
      throw new Error(
        '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
      );
    }

    await using app = await createAtcdnApp(config);
    const server = serve({ fetch: app.fetch, port: config.port });

    await Promise.race([
      events.once(process, "SIGINT"),
      events.once(process, "SIGTERM"),
    ]);
    const closed = events.once(server, "close");
    server.close();
    await closed;
  },
});

await cli(process.argv.slice(2), command, {
  name: "atcdn",
  version: pkg.version,
});
