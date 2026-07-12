import type { Atblob } from "@atblob/core";
import type { Env, Handler } from "hono";

export const IMG_PATH = "/img/:preset/plain/:did/:cidAndFormat";

const splitCidAndFormat = (
  cidAndFormat: string,
): { cid: string; format: string | undefined } => {
  const [cid = "", ...rest] = cidAndFormat.split("@");
  return { cid, format: rest.length > 0 ? rest.join("@") : undefined };
};

export const createImgHandler = (
  atblob: Atblob,
): Handler<Env, typeof IMG_PATH> => {
  return async (c) => {
    const { preset, did, cidAndFormat } = c.req.param();
    const { cid, format } = splitCidAndFormat(cidAndFormat);

    const result = await atblob.render({
      preset,
      did,
      cid,
      format,
    });
    return c.body(new Uint8Array(result.bytes), 200, result.headers);
  };
};
