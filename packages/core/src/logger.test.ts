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
      const logger = createConsoleLogger();

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
    const logger = createConsoleLogger();

    logger.info("no fields");

    const output: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(output).toMatchObject({ level: "info", message: "no fields" });
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
