import events from "node:events";

import { createRenderer, type Logger } from "@atblob/core";
import { atblob } from "@atblob/hono";
import { serve } from "@hono/node-server";
import arg from "arg";
import { Hono, type MiddlewareHandler } from "hono";

import pkg from "../package.json" with { type: "json" };
import {
  buildConfig,
  DID_CACHE_CHOICES,
  type Env,
  LOG_FORMAT_CHOICES,
  LOG_LEVEL_CHOICES,
} from "./config.js";

export type { Env } from "./config.js";

const logger = (log: Logger): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    await next();
    log.info("access", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    });
  };
};

const ROOT_TEXT = `
           __  __    __      __
    ____ _/ /_/ /_  / /___  / /_
   / __ \`/ __/ __ \\/ / __ \\/ __ \\
  / /_/ / /_/ /_/ / / /_/ / /_/ /
  \\__,_/\\__/_.___/_/\\____/_.___/


This is a cdn.bsky.app-compatible atproto image proxy server.

  Code: https://github.com/mkizka/atblob
`;

const HELP_TEXT = `Usage: atblob [options]

Start a cdn.bsky.app-compatible image server

Options:
  --did-cache <choice>       Where to cache DID resolution results (${DID_CACHE_CHOICES.join(", ")})
  --redis-url <url>          Redis URL used for the DID cache
  --max-blob-size <number>   Maximum allowed blob size (bytes)
  --did-resolve-timeout <number>  DID resolution timeout (milliseconds)
  --blob-fetch-timeout <number>   Blob fetch timeout (milliseconds)
  --blob-cache-ttl <number>  Blob cache TTL (milliseconds)
  --plc-directory-url <url>  PLC Directory URL
  -p, --port <number>        Port number the server listens on
  --log-level <choice>       Minimum log level to output (${LOG_LEVEL_CHOICES.join(", ")})
  --log-format <choice>      Log output format (${LOG_FORMAT_CHOICES.join(", ")})
  -h, --help                 Display this message
  -v, --version              Display version number
`;

function oneOf<const T extends readonly string[]>(choices: T) {
  return (value: string, argName: string): T[number] => {
    if (!choices.includes(value)) {
      throw new Error(`${argName} must be one of: ${choices.join(", ")}`);
    }
    return value;
  };
}

export async function runCli(argv: string[], processEnv: Env): Promise<void> {
  const args = arg(
    {
      "--did-cache": oneOf(DID_CACHE_CHOICES),
      "--redis-url": String,
      "--max-blob-size": Number,
      "--did-resolve-timeout": Number,
      "--blob-fetch-timeout": Number,
      "--blob-cache-ttl": Number,
      "--plc-directory-url": String,
      "--port": Number,
      "--log-level": oneOf(LOG_LEVEL_CHOICES),
      "--log-format": oneOf(LOG_FORMAT_CHOICES),
      "--help": Boolean,
      "--version": Boolean,
      "-p": "--port",
      "-h": "--help",
      "-v": "--version",
    },
    { argv },
  );

  if (args["--help"]) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return;
  }

  if (args["--version"]) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  const config = buildConfig(
    {
      didCache: args["--did-cache"],
      redisUrl: args["--redis-url"],
      maxBlobSize: args["--max-blob-size"],
      didResolveTimeout: args["--did-resolve-timeout"],
      blobFetchTimeout: args["--blob-fetch-timeout"],
      blobCacheTTL: args["--blob-cache-ttl"],
      plcDirectoryUrl: args["--plc-directory-url"],
      port: args["--port"],
      logLevel: args["--log-level"],
      logFormat: args["--log-format"],
    },
    processEnv,
  );
  const label = `atblob@${pkg.version}`;

  const app = new Hono();
  app.use(logger(config.logger));

  await using renderer = await createRenderer(config);
  app.use(atblob(renderer));

  app.get("/", (c) => c.text(ROOT_TEXT));

  app.get("/health", async (c) => {
    const result = await renderer.checkHealth();
    return c.json(
      { version: pkg.version, ...result },
      result.status === "ok" ? 200 : 503,
    );
  });

  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    config.logger.info(
      `${label} server started on http://localhost:${info.port}`,
    );
  });

  await Promise.race([
    events.once(process, "SIGINT"),
    events.once(process, "SIGTERM"),
  ]);
  const closed = events.once(server, "close");
  server.close();
  await closed;
  config.logger.info(`${label} server stopped`);
}
