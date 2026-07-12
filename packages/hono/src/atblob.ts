import type { Renderer } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import type { MiddlewareHandler } from "hono";

const IMG_PATTERN = /^\/img\/([^/]+)\/plain\/([^/]+)\/([^/]+)$/;

const IMAGE_HEADERS = {
  "Cache-Control": "public, max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

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
      const image = await renderer.render({ preset, did, cid, format });
      const headers = { ...IMAGE_HEADERS, "Content-Type": image.contentType };
      if (c.req.method === "HEAD") {
        return c.body(null, 200, headers);
      }
      return c.body(new Uint8Array(image.bytes), 200, headers);
    } catch (error) {
      const { status, headers } = toErrorResponse(error);
      return c.body(null, status, headers);
    }
  };
};
