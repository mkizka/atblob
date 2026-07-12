import events from "node:events";

import { createConsoleLogger } from "@atblob/core";
import { createAtblobApp } from "@atblob/hono";
import { serve } from "@hono/node-server";
import arg from "arg";

import pkg from "../package.json" with { type: "json" };
import {
  buildConfig,
  DID_CACHE_CHOICES,
  type Env,
  LOG_LEVEL_CHOICES,
} from "./config.js";

const HELP_TEXT = `Usage: atblob [options]

Start a cdn.bsky.app-compatible image server

Options:
  --did-cache <choice>       Where to cache DID resolution results (${DID_CACHE_CHOICES.join(", ")})
  --redis-url <url>          Redis URL used for the DID cache
  --max-blob-size <number>   Maximum allowed blob size (bytes)
  --did-resolve-timeout <number>  DID resolution timeout (milliseconds)
  --blob-fetch-timeout <number>   Blob fetch timeout (milliseconds)
  --plc-directory-url <url>  PLC Directory URL
  -p, --port <number>        Port number the server listens on
  --log-level <choice>       Minimum log level to output (${LOG_LEVEL_CHOICES.join(", ")})
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
      "--plc-directory-url": String,
      "--port": Number,
      "--log-level": oneOf(LOG_LEVEL_CHOICES),
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
      plcDirectoryUrl: args["--plc-directory-url"],
      port: args["--port"],
      logLevel: args["--log-level"],
    },
    processEnv,
  );
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
