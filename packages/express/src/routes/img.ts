import type { Atblob } from "@atblob/core";
import type { RequestHandler } from "express";

export const IMG_PATH = "/img/:preset/plain/:did/:cidAndFormat";

type ImgParams = {
  preset: string;
  did: string;
  cidAndFormat: string;
};

const splitCidAndFormat = (
  cidAndFormat: string,
): { cid: string; format: string | undefined } => {
  const [cid = "", ...rest] = cidAndFormat.split("@");
  return { cid, format: rest.length > 0 ? rest.join("@") : undefined };
};

export const createImgHandler = (atblob: Atblob): RequestHandler<ImgParams> => {
  return async (req, res, next) => {
    try {
      const { preset, did, cidAndFormat } = req.params;
      const { cid, format } = splitCidAndFormat(cidAndFormat);

      const result = await atblob.render({
        preset,
        did,
        cid,
        format,
      });
      res.status(200).set(result.headers);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(Buffer.from(result.bytes));
    } catch (error) {
      next(error);
    }
  };
};
