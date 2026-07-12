import {
  type Atblob,
  type AtblobConfig,
  createAtblob,
  toErrorResponse,
} from "@atblob/core";
import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";

import { createImgHandler, IMG_PATH } from "./routes/img.js";

type AtblobExpress = Express & AsyncDisposable;

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const { status, headers } = toErrorResponse(error);
  res.status(status).set(headers).end();
};

const createAccessLog = (logger: Atblob["logger"]): RequestHandler => {
  return (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info("access", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  };
};

export const createAtblobApp = async (
  config: AtblobConfig = {},
): Promise<AtblobExpress> => {
  const atblob = await createAtblob(config);

  const imgHandler = createImgHandler(atblob);

  const app = express();
  app.use(createAccessLog(atblob.logger));
  app.get(IMG_PATH, imgHandler);
  app.head(IMG_PATH, imgHandler);
  app.use(handleError);

  return Object.assign(app, {
    [Symbol.asyncDispose]: atblob[Symbol.asyncDispose],
  });
};
