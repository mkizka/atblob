export abstract class AtcdnHttpError extends Error {
  abstract readonly status: 400 | 404 | 502;
}

export class BadRequestError extends AtcdnHttpError {
  override readonly status = 400;
  override readonly name = "BadRequestError";
}

export class NotFoundError extends AtcdnHttpError {
  override readonly status = 404;
  override readonly name = "NotFoundError";
}

export class BadGatewayError extends AtcdnHttpError {
  override readonly status = 502;
  override readonly name = "BadGatewayError";
}

type ErrorResponse = {
  status: 400 | 404 | 502;
  headers: Record<string, string>;
};

export const toErrorResponse = (error: unknown): ErrorResponse => ({
  status: error instanceof AtcdnHttpError ? error.status : 502,
  headers: {
    "Cache-Control": "public, max-age=60",
  },
});
