import type { Did } from "../../did/did.js";
import type { FetchedBlob } from "../fetcher.js";

export type BlobCache = {
  get: (did: Did, cid: string) => Promise<FetchedBlob | undefined>;
  set: (did: Did, cid: string, blob: FetchedBlob) => Promise<void>;
};
