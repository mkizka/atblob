import events from "node:events";

import { createConsoleLogger } from "@atblob/core";
import { createAtblobApp } from "@atblob/hono";
import { serve } from "@hono/node-server";
import { cli, define } from "gunshi";

import pkg from "../package.json" with { type: "json" };
import {
  buildConfig,
  DID_CACHE_CHOICES,
  type Env,
  LOG_LEVEL_CHOICES,
} from "./config.js";

export async function runCli(argv: string[], processEnv: Env): Promise<void> {
  const command = define({
    name: "atblob",
    description: "Start a cdn.bsky.app-compatible image server",
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
      logLevel: {
        type: "enum",
        choices: LOG_LEVEL_CHOICES,
        description: "Minimum log level to output",
      },
    },
    run: async (ctx) => {
      const config = buildConfig(ctx.values, processEnv);
      const label = `atblob v${pkg.version}`;

      await using app = await createAtblobApp(config);
      const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
        config.logger.info(
          `${label} server started on http://${info.address}:${info.port}`,
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
    },
  });

  await cli(argv, command, {
    name: "atblob",
    version: pkg.version,
    renderHeader: null,
  });
}

function describeError(error: unknown): {
  message: string;
  name?: string | undefined;
  stack?: string | undefined;
} {
  if (error instanceof AggregateError) {
    return {
      message: error.errors
        .map((cause: unknown) =>
          cause instanceof Error ? cause.message : String(cause),
        )
        .join("; "),
      name: error.name,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }
  return { message: "Unknown error" };
}

export async function runCliEntrypoint(
  argv: string[],
  processEnv: Env,
): Promise<number> {
  try {
    await runCli(argv, processEnv);
    return 0;
  } catch (error) {
    const { message, name, stack } = describeError(error);
    createConsoleLogger().error(message, { name, stack });
    return 1;
  }
}
