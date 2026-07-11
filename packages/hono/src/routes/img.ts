import type { Atcdn } from "@atcdn/core";
import type { Env, Handler } from "hono";

export const IMG_PATH = "/img/:preset/plain/:did/:cidAndFormat";

const splitCidAndFormat = (
  cidAndFormat: string,
): { cid: string; format: string | undefined } => {
  const [cid = "", ...rest] = cidAndFormat.split("@");
  return { cid, format: rest.length > 0 ? rest.join("@") : undefined };
};

export const createImgHandler = (
  atcdn: Atcdn,
): Handler<Env, typeof IMG_PATH> => {
  return async (c) => {
    const { preset, did, cidAndFormat } = c.req.param();
    const { cid, format } = splitCidAndFormat(cidAndFormat);

    const result = await atcdn.render({
      preset,
      did,
      cid,
      format,
    });
    if (c.req.method === "HEAD") {
      return c.body(null, 200, result.headers);
    }
    return c.body(new Uint8Array(result.bytes), 200, result.headers);
  };
};
