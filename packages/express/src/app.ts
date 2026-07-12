import type { Atblob } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import express, { type ErrorRequestHandler, type Express } from "express";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, headers } = toErrorResponse(error);
  res.status(status).set(headers).end();
};

export const createAtblobApp = (atblob: Atblob): Express => {
  const imgHandler = createImgHandler(atblob);

  const app = express();
  app.get(IMG_PATH, imgHandler);
  app.head(IMG_PATH, imgHandler);
  app.use(handleError);

  return app;
};
