import type { Renderer } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import type { MiddlewareHandler } from "hono";

const IMG_PATTERN = /^\/img\/([^/]+)\/plain\/([^/]+)\/([^/]+)$/;

const splitCidAndFormat = (
  cidAndFormat: string,
): { cid: string; format: string | undefined } => {
  const [cid = "", ...rest] = cidAndFormat.split("@");
  return { cid, format: rest.length > 0 ? rest.join("@") : undefined };
};

export const atblob = (renderer: Renderer): MiddlewareHandler => {
  return async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return next();
    }
    const match = IMG_PATTERN.exec(c.req.path);
    if (!match) {
      return next();
    }
    const [, preset = "", did = "", cidAndFormat = ""] = match;
    const { cid, format } = splitCidAndFormat(cidAndFormat);

    try {
      const result = await renderer.render({ preset, did, cid, format });
      if (c.req.method === "HEAD") {
        return c.body(null, 200, result.headers);
      }
      return c.body(new Uint8Array(result.bytes), 200, result.headers);
    } catch (error) {
      const { status, headers } = toErrorResponse(error);
      return c.body(null, status, headers);
    }
  };
};
