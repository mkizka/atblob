import {
  type AtblobConfig,
  createConsoleLogger,
  type Logger,
} from "@atblob/core";
import * as v from "valibot";

export type Env = Record<string, string | undefined>;

export const DID_CACHE_CHOICES = ["memory", "redis"] as const;

export const LOG_LEVEL_CHOICES = [
  "debug",
  "info",
  "warn",
  "error",
  "silent",
] as const;

export const LOG_FORMAT_CHOICES = ["json", "pretty"] as const;

export type AtblobCliConfig = AtblobConfig & {
  port: number;
  logger: Logger;
};

type NonRequired<T> = {
  [K in keyof T]?: T[K] | undefined;
};

export type CliArgValues = NonRequired<{
  didCache: (typeof DID_CACHE_CHOICES)[number];
  redisUrl: string;
  maxBlobSize: number;
  didResolveTimeout: number;
  blobFetchTimeout: number;
  maxConcurrentPerHost: number;
  plcDirectoryUrl: string;
  port: number;
  logLevel: (typeof LOG_LEVEL_CHOICES)[number];
  logFormat: (typeof LOG_FORMAT_CHOICES)[number];
}>;

const numberSchema = v.pipe(
  v.string(),
  v.transform(Number),
  v.check((value) => !Number.isNaN(value), "must be a number"),
);

const didCacheSchema = v.picklist(
  DID_CACHE_CHOICES,
  `must be one of: ${DID_CACHE_CHOICES.join(", ")}`,
);

const logLevelSchema = v.picklist(
  LOG_LEVEL_CHOICES,
  `must be one of: ${LOG_LEVEL_CHOICES.join(", ")}`,
);

const logFormatSchema = v.picklist(
  LOG_FORMAT_CHOICES,
  `must be one of: ${LOG_FORMAT_CHOICES.join(", ")}`,
);

const stringSchema = v.string();

export function buildConfig(
  values: CliArgValues,
  processEnv: Env,
): AtblobCliConfig {
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
    const raw = processEnv[envName];
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

  // prettier-ignore
  const config = {
    didCache: values.didCache ?? env("DID_CACHE", didCacheSchema),
    redisUrl: values.redisUrl ?? env("REDIS_URL", stringSchema),
    maxBlobSize: values.maxBlobSize ?? env("MAX_BLOB_SIZE", numberSchema),
    didResolveTimeout: values.didResolveTimeout ?? env("DID_RESOLVE_TIMEOUT", numberSchema),
    blobFetchTimeout: values.blobFetchTimeout ?? env("BLOB_FETCH_TIMEOUT", numberSchema),
    maxConcurrentPerHost: values.maxConcurrentPerHost ?? env("MAX_CONCURRENT_PER_HOST", numberSchema),
    plcDirectoryUrl: values.plcDirectoryUrl ?? env("PLC_DIRECTORY_URL", stringSchema),
    port: values.port ?? env("PORT", numberSchema, 3000),
    logger: createConsoleLogger({
      level: values.logLevel ?? env("LOG_LEVEL", logLevelSchema, "info"),
      format: values.logFormat ?? env("LOG_FORMAT", logFormatSchema, "pretty"),
    }),
  } satisfies AtblobCliConfig;

  if (config.didCache === "redis" && config.redisUrl === undefined) {
    throw new Error(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  }

  return config;
}
