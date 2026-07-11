import { type AtcdnConfig, createAtcdn, toErrorResponse } from "@atcdn/core";
import { Hono } from "hono";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

export const createAtcdnApp = async (config: AtcdnConfig = {}) => {
  const atcdn = await createAtcdn(config);

  const app = new Hono();
  app.on(["GET", "HEAD"], IMG_PATH, createImgHandler(atcdn));
  app.onError((error, c) => {
    const { status, headers } = toErrorResponse(error);
    return c.body(null, status, headers);
  });

  return Object.assign(app, {
    [Symbol.asyncDispose]: atcdn[Symbol.asyncDispose],
  });
};
