import { type AtblobConfig, createAtblob, toErrorResponse } from "@atblob/core";
import express, { type ErrorRequestHandler, type Express } from "express";

import { createHealthHandler, HEALTH_PATH } from "./routes/health.js";
import { createImgHandler, IMG_PATH } from "./routes/img.js";

type AtblobExpress = Express & AsyncDisposable;

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, headers } = toErrorResponse(error);
  res.status(status).set(headers).end();
};

export const createAtblobApp = async (
  config: AtblobConfig = {},
): Promise<AtblobExpress> => {
  const atblob = await createAtblob(config);

  const imgHandler = createImgHandler(atblob);

  const app = express();
  app.get(IMG_PATH, imgHandler);
  app.head(IMG_PATH, imgHandler);
  app.get(HEALTH_PATH, createHealthHandler(atblob));
  app.use(handleError);

  return Object.assign(app, {
    [Symbol.asyncDispose]: atblob[Symbol.asyncDispose],
  });
};
