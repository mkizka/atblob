import type { Atblob } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import { Hono } from "hono";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

export const createAtblobApp = (atblob: Atblob) => {
  const app = new Hono();
  app.get(IMG_PATH, createImgHandler(atblob));
  app.onError((error, c) => {
    const { status, headers } = toErrorResponse(error);
    return c.body(null, status, headers);
  });

  return app;
};
