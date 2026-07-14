import { describe, expect, it } from "vitest";

import {
  BadGatewayError,
  BadRequestError,
  NotFoundError,
  toErrorResponse,
  TooManyRequestsError,
} from "./errors.js";

describe("toErrorResponse", () => {
  it("BadRequestError results in status 400", () => {
    const response = toErrorResponse(new BadRequestError("bad request"));

    expect(response.status).toBe(400);
  });

  it("NotFoundError results in status 404", () => {
    const response = toErrorResponse(new NotFoundError("not found"));

    expect(response.status).toBe(404);
  });

  it("TooManyRequestsError results in status 429", () => {
    const response = toErrorResponse(new TooManyRequestsError("too many"));

    expect(response.status).toBe(429);
  });

  it("BadGatewayError results in status 502", () => {
    const response = toErrorResponse(new BadGatewayError("bad gateway"));

    expect(response.status).toBe(502);
  });

  it("errors other than AtblobHttpError result in status 502", () => {
    const response = toErrorResponse(new Error("unexpected"));

    expect(response.status).toBe(502);
  });

  it("also results in status 502 when a non-error value is passed", () => {
    const response = toErrorResponse("not an error");

    expect(response.status).toBe(502);
  });

  it("always attaches a Cache-Control header", () => {
    const response = toErrorResponse(new NotFoundError("not found"));

    expect(response.headers).toEqual({
      "Cache-Control": "public, max-age=60",
    });
  });
});
