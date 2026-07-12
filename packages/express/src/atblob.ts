import type { Renderer } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import express, { type ErrorRequestHandler, type Router } from "express";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, headers } = toErrorResponse(error);
  res.status(status).set(headers).end();
};

// An Express Router calls next() on its own when no route inside it
// matches, so mounting it via app.use() naturally falls through to
// whatever else the consumer's app defines.
export const atblob = (renderer: Renderer): Router => {
  const imgHandler = createImgHandler(renderer);

  const router = express.Router();
  router.get(IMG_PATH, imgHandler);
  router.head(IMG_PATH, imgHandler);
  router.use(handleError);

  return router;
};
