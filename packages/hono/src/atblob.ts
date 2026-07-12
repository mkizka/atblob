import type { Renderer } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import { Hono, type MiddlewareHandler } from "hono";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

// Hono has no Express-Router-like concept of a sub-app that falls through to
// the parent's next middleware on an unmatched route, so we mark our own
// "no route matched" response and use that to decide whether to call next().
const PASSTHROUGH_HEADER = "X-Atblob-Passthrough";

export const atblob = (renderer: Renderer): MiddlewareHandler => {
  const router = new Hono();
  router.get(IMG_PATH, createImgHandler(renderer));
  router.notFound((c) => c.body(null, 404, { [PASSTHROUGH_HEADER]: "1" }));
  router.onError((error, c) => {
    const { status, headers } = toErrorResponse(error);
    return c.body(null, status, headers);
  });

  return async (c, next) => {
    const res = await router.fetch(c.req.raw);
    if (res.headers.has(PASSTHROUGH_HEADER)) {
      return next();
    }
    return res;
  };
};
