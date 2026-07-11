import { type AtcdnConfig, createAtcdn, toErrorResponse } from "@atcdn/core";
import express, { type ErrorRequestHandler, type Express } from "express";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

export type { AtcdnConfig } from "@atcdn/core";

export type AtcdnExpress = Express & AsyncDisposable;

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, headers } = toErrorResponse(error);
  res.status(status).set(headers).end();
};

export const createAtcdnApp = async (
  config: AtcdnConfig = {},
): Promise<AtcdnExpress> => {
  const atcdn = await createAtcdn(config);

  const imgHandler = createImgHandler(atcdn);

  const app = express();
  app.get(IMG_PATH, imgHandler);
  app.head(IMG_PATH, imgHandler);
  app.use(handleError);

  return Object.assign(app, {
    [Symbol.asyncDispose]: atcdn[Symbol.asyncDispose],
  });
};
