import { unicastFetchWrap } from "@atproto-labs/fetch-node";

// atblob resolves untrusted did:web hostnames and PDS endpoints, so every
// outbound request it makes on the caller's behalf must be HTTPS-only and
// unicast-only. This returns a fetch function scoped to a single renderer
// instance - unlike undici's setGlobalDispatcher(), it never touches
// globalThis.fetch, so a host app embedding @atblob/hono or @atblob/express
// never has its own unrelated fetch() calls affected.
//
// The underlying unicast-checking dispatcher is built lazily, on first use
// rather than at construction time, so it picks up whatever globalThis.fetch
// resolves to once the renderer actually starts serving requests (e.g. a
// test's fetch mock installed after createRenderer() is still respected),
// while still only being built once per renderer so its connection pool is
// reused across requests.
export const createScopedFetch = (): typeof fetch => {
  let unicastOnlyFetch: typeof fetch | undefined;
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.protocol !== "https:") {
      throw new TypeError(`fetch failed: forbidden protocol: ${url.protocol}`);
    }
    if (!unicastOnlyFetch) {
      unicastOnlyFetch = unicastFetchWrap({ fetch: globalThis.fetch });
    }
    return unicastOnlyFetch(input, init);
  };
};
