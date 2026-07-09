import { isUnicastIpHostname, unicastLookup } from "@atproto-labs/fetch-node";
import { Agent, Pool, setGlobalDispatcher } from "undici";

let installed = false;

export const installSsrfProtection = (): void => {
  if (installed) {
    return;
  }
  installed = true;
  setGlobalDispatcher(
    // ref: https://github.com/bluesky-social/atproto/blob/6b493b77f56b7de47f5eb91d29f726cdc7794e46/packages/bsky/src/api/blob-dispatcher.ts
    new Agent({
      factory: (origin, opts) => {
        const { protocol, hostname } =
          origin instanceof URL ? origin : new URL(origin);
        if (protocol !== "https:") {
          throw new Error(`forbidden protocol: ${protocol}`);
        }
        if (isUnicastIpHostname(hostname) === false) {
          throw new Error(`hostname resolved to non-unicast address`);
        }
        return new Pool(origin, opts);
      },
      connect: { lookup: unicastLookup },
    }),
  );
};
