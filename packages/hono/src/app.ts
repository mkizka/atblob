import {
  type AtblobConfig,
  createAtblob,
  logError,
  toErrorResponse,
} from "@atblob/core";
import { Hono } from "hono";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

export const createAtblobApp = async (config: AtblobConfig = {}) => {
  const atblob = await createAtblob(config);

  const app = new Hono();
  app.on(["GET", "HEAD"], IMG_PATH, createImgHandler(atblob));
  app.onError((error, c) => {
    logError(atblob.logger, error);
    const { status, headers } = toErrorResponse(error);
    return c.body(null, status, headers);
  });

  return Object.assign(app, {
    [Symbol.asyncDispose]: atblob[Symbol.asyncDispose],
  });
};
