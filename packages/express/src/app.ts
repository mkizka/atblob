import {
  type AtblobConfig,
  createAtblob,
  logError,
  toErrorResponse,
} from "@atblob/core";
import express, { type ErrorRequestHandler, type Express } from "express";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

type AtblobExpress = Express & AsyncDisposable;

export const createAtblobApp = async (
  config: AtblobConfig = {},
): Promise<AtblobExpress> => {
  const atblob = await createAtblob(config);

  const imgHandler = createImgHandler(atblob);

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    logError(atblob.logger, error);
    const { status, headers } = toErrorResponse(error);
    res.status(status).set(headers).end();
  };

  const app = express();
  app.get(IMG_PATH, imgHandler);
  app.head(IMG_PATH, imgHandler);
  app.use(handleError);

  return Object.assign(app, {
    [Symbol.asyncDispose]: atblob[Symbol.asyncDispose],
  });
};
