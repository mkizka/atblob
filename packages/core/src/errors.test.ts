import { describe, expect, it, vi } from "vitest";

import {
  BadGatewayError,
  BadRequestError,
  logError,
  NotFoundError,
  toErrorResponse,
} from "./errors.js";
import { createNoopLogger } from "./logger.js";

describe("toErrorResponse", () => {
  it("BadRequestErrorはstatus 400になる", () => {
    const response = toErrorResponse(new BadRequestError("bad request"));

    expect(response.status).toBe(400);
  });

  it("NotFoundErrorはstatus 404になる", () => {
    const response = toErrorResponse(new NotFoundError("not found"));

    expect(response.status).toBe(404);
  });

  it("BadGatewayErrorはstatus 502になる", () => {
    const response = toErrorResponse(new BadGatewayError("bad gateway"));

    expect(response.status).toBe(502);
  });

  it("AtblobHttpError以外のエラーはstatus 502になる", () => {
    const response = toErrorResponse(new Error("unexpected"));

    expect(response.status).toBe(502);
  });

  it("エラー以外の値が渡された場合もstatus 502になる", () => {
    const response = toErrorResponse("not an error");

    expect(response.status).toBe(502);
  });

  it("Cache-Controlヘッダーを常に付与する", () => {
    const response = toErrorResponse(new NotFoundError("not found"));

    expect(response.headers).toEqual({
      "Cache-Control": "public, max-age=60",
    });
  });
});

describe("logError", () => {
  it("Errorインスタンスの場合はmessage・name・stackをログに出力する", () => {
    const logger = createNoopLogger();
    const errorSpy = vi.spyOn(logger, "error");
    const error = new BadRequestError("bad request");

    logError(logger, error);

    expect(errorSpy).toHaveBeenCalledWith("bad request", {
      name: "BadRequestError",
      stack: error.stack,
    });
  });

  it("Errorインスタンスでない値の場合もログに出力する", () => {
    const logger = createNoopLogger();
    const errorSpy = vi.spyOn(logger, "error");

    logError(logger, "not an error");

    expect(errorSpy).toHaveBeenCalledWith("Unknown error", {
      name: undefined,
      stack: undefined,
    });
  });
});
