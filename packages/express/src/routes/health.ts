import type { Atblob } from "@atblob/core";
import type { RequestHandler } from "express";

import pkg from "../../package.json" with { type: "json" };

export const HEALTH_PATH = "/img/health";

export const createHealthHandler = (atblob: Atblob): RequestHandler => {
  return async (_req, res) => {
    const result = await atblob.checkHealth();
    res
      .status(result.status === "ok" ? 200 : 503)
      .json({ version: pkg.version, ...result });
  };
};
