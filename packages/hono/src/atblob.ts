import type { Renderer } from "@atblob/core";
import { toErrorResponse } from "@atblob/core";
import type { MiddlewareHandler } from "hono";
import { PatternRouter } from "hono/router/pattern-router";

const IMG_PATH = "/img/:preset/plain/:did/:cidAndFormat";

const splitCidAndFormat = (
  cidAndFormat: string,
): { cid: string; format: string | undefined } => {
  const [cid = "", ...rest] = cidAndFormat.split("@");
  return { cid, format: rest.length > 0 ? rest.join("@") : undefined };
};

export const atblob = (renderer: Renderer): MiddlewareHandler => {
  const router = new PatternRouter<true>();
  router.add("GET", IMG_PATH, true);
  router.add("HEAD", IMG_PATH, true);

  return async (c, next) => {
    // PatternRouter always returns the single-element [handlers] form of
    // Result<T>, never the RegExpRouter-style [handlers, paramStash] form,
    // but the shared Router<T> interface types match() as a union of both.
    const matchResult = router.match(c.req.method, c.req.path);
    if (matchResult.length !== 1) {
      return next();
    }
    const [handlers] = matchResult;
    const matched = handlers[0];
    if (!matched) {
      return next();
    }
    const [, params] = matched;
    const { preset = "", did = "", cidAndFormat = "" } = params;
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
