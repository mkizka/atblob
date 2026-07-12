export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
};

type Level = "debug" | "info" | "warn" | "error";

export type LogLevel = Level | "silent";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const consoleLog: Record<Level, (line: string) => void> = {
  debug: (line) => console.debug(line),
  info: (line) => console.info(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

export type LogFormat = "json" | "pretty";

const formatJson = (
  level: Level,
  message: string,
  fields?: LogFields,
): string =>
  JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  });

const formatFieldValue = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

const formatPretty = (
  level: Level,
  message: string,
  fields?: LogFields,
): string => {
  const time = new Date().toISOString();
  const fieldsText = fields
    ? Object.entries(fields)
        .map(([key, value]) => ` ${key}=${formatFieldValue(value)}`)
        .join("")
    : "";
  return `${time} ${level.toUpperCase()} ${message}${fieldsText}`;
};

export const createConsoleLogger = (options?: {
  level?: LogLevel;
  format?: LogFormat;
}): Logger => {
  const threshold = LEVEL_PRIORITY[options?.level ?? "info"];
  const format = options?.format === "json" ? formatJson : formatPretty;

  const write = (level: Level, message: string, fields?: LogFields): void => {
    if (LEVEL_PRIORITY[level] < threshold) {
      return;
    }
    consoleLog[level](format(level, message, fields));
  };

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
};

export const createNoopLogger = (): Logger => ({
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});
