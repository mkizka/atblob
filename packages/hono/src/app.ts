import {
  type Atblob,
  type AtblobConfig,
  createAtblob,
  toErrorResponse,
} from "@atblob/core";
import { Hono, type MiddlewareHandler } from "hono";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

const createAccessLog = (logger: Atblob["logger"]): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      logger.info("access", {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - start,
      });
    }
  };
};

export const createAtblobApp = async (config: AtblobConfig = {}) => {
  const atblob = await createAtblob(config);

  const app = new Hono();
  app.use(createAccessLog(atblob.logger));
  app.on(["GET", "HEAD"], IMG_PATH, createImgHandler(atblob));
  app.onError((error, c) => {
    const { status, headers } = toErrorResponse(error);
    return c.body(null, status, headers);
  });

  return Object.assign(app, {
    [Symbol.asyncDispose]: atblob[Symbol.asyncDispose],
  });
};
