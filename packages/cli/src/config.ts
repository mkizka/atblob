import {
  type AtblobConfig,
  createConsoleLogger,
  type Logger,
} from "@atblob/hono";
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
  plcDirectoryUrl: string;
  port: number;
  logLevel: (typeof LOG_LEVEL_CHOICES)[number];
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

const stringSchema = v.string();

function env<T>(
  env: Env,
  envName: string,
  schema: v.GenericSchema<string, T>,
): T | undefined;
function env<T>(
  env: Env,
  envName: string,
  schema: v.GenericSchema<string, T>,
  defaultValue: T,
): T;
function env<T>(
  env: Env,
  envName: string,
  schema: v.GenericSchema<string, T>,
  defaultValue?: T,
): T | undefined {
  const raw = env[envName];
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

export function buildConfig(
  values: CliArgValues,
  processEnv: Env,
): AtblobCliConfig {
  // prettier-ignore
  const config = {
    didCache: values.didCache ?? env(processEnv, "DID_CACHE", didCacheSchema),
    redisUrl: values.redisUrl ?? env(processEnv, "REDIS_URL", stringSchema),
    maxBlobSize: values.maxBlobSize ?? env(processEnv, "MAX_BLOB_SIZE", numberSchema),
    didResolveTimeout: values.didResolveTimeout ?? env(processEnv, "DID_RESOLVE_TIMEOUT", numberSchema),
    blobFetchTimeout: values.blobFetchTimeout ?? env(processEnv, "BLOB_FETCH_TIMEOUT", numberSchema),
    plcDirectoryUrl: values.plcDirectoryUrl ?? env(processEnv, "PLC_DIRECTORY_URL", stringSchema),
    port: values.port ?? env(processEnv, "PORT", numberSchema, 3000),
    logger: createConsoleLogger({
      level: values.logLevel ?? env(processEnv, "LOG_LEVEL", logLevelSchema, "info"),
    }),
  } satisfies AtblobCliConfig;

  if (
    (!config.didCache || config.didCache === "redis") &&
    config.redisUrl === undefined
  ) {
    throw new Error(
      '--redis-url (or the REDIS_URL environment variable) is required when --did-cache is "redis"',
    );
  }

  return config;
}
