import type { Atblob } from "@atblob/core";
import type { Env, Handler } from "hono";

import pkg from "../../package.json" with { type: "json" };

export const HEALTH_PATH = "/img/health";

export const createHealthHandler = (
  atblob: Atblob,
): Handler<Env, typeof HEALTH_PATH> => {
  return async (c) => {
    const result = await atblob.checkHealth();
    return c.json(
      { version: pkg.version, ...result },
      result.status === "ok" ? 200 : 503,
    );
  };
};
