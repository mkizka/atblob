import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger, createNoopLogger } from "./logger.js";

describe("createConsoleLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["debug", "console.debug" as const],
    ["info", "console.info" as const],
    ["warn", "console.warn" as const],
    ["error", "console.error" as const],
  ] as const)(
    "%sはlevel・message・fieldsを含むJSONを出力する",
    (level, _consoleMethodLabel) => {
      const spy = vi.spyOn(console, level).mockImplementation(() => undefined);
      const logger = createConsoleLogger({ level: "debug", format: "json" });

      logger[level]("something happened", { did: "did:plc:example" });

      expect(spy).toHaveBeenCalledTimes(1);
      const output: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
      expect(output).toMatchObject({
        level,
        message: "something happened",
        did: "did:plc:example",
      });
    },
  );

  it("fieldsを省略した場合もmessageのみのJSONを出力する", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const logger = createConsoleLogger({ format: "json" });

    logger.info("no fields");

    const output: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(output).toMatchObject({ level: "info", message: "no fields" });
  });

  it("formatを指定しない場合はpretty形式で出力する", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    logger.info("something happened", { did: "did:plc:example" });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO {2}something happened did=did:plc:example$/,
    );
  });

  it("formatにprettyを指定するとlevel・message・fieldsを読みやすい形式で出力する", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = createConsoleLogger({ format: "pretty" });

    logger.warn("no fields");

    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z WARN {2}no fields$/,
    );
  });

  it("levelを指定しない場合はinfo未満(debug)を出力しない", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    logger.debug("hidden");
    logger.info("shown");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it("levelにwarnを指定するとdebug・infoを出力しない", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger({ level: "warn" });

    logger.debug("hidden");
    logger.info("hidden");
    logger.warn("shown");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("levelにsilentを指定すると何も出力しない", () => {
    const spies = (["debug", "info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const logger = createConsoleLogger({ level: "silent" });

    logger.debug("x");
    logger.info("x");
    logger.warn("x");
    logger.error("x");

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

describe("createNoopLogger", () => {
  it("何も出力しない", () => {
    const spies = (["debug", "info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const logger = createNoopLogger();

    logger.debug("x");
    logger.info("x");
    logger.warn("x");
    logger.error("x");

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });
    vi.restoreAllMocks();
  });
});
