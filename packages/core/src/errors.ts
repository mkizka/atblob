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
