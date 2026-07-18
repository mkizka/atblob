import { AsyncLocalStorage } from "node:async_hooks";

import { unicastFetchWrap } from "@atproto-labs/fetch-node";

const activeRequest = new AsyncLocalStorage<true>();

const installedFetches = new WeakSet<typeof fetch>();

// atblob renders untrusted did:web hostnames and PDS endpoints, so every
// outbound request made while resolving a render (both @atproto/identity's
// own DID document fetches and our own blob fetch in fetcher.ts) must be
// HTTPS-only and unicast-only. @atproto/identity doesn't accept a custom
// fetch or dispatcher, so the only way to cover its requests too is to
// patch the global fetch - but only for the duration of a render, so a
// host app embedding @atblob/hono or @atblob/express doesn't have its own
// unrelated fetch() calls affected.
const ensureGuardInstalled = (): void => {
  if (installedFetches.has(globalThis.fetch)) {
    return;
  }
  const passthrough = globalThis.fetch;
  const unicastOnlyFetch = unicastFetchWrap({ fetch: passthrough });

  const guarded: typeof fetch = (input, init) => {
    if (!activeRequest.getStore()) {
      return passthrough(input, init);
    }
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.protocol !== "https:") {
      return Promise.reject(
        new TypeError(`fetch failed: forbidden protocol: ${url.protocol}`),
      );
    }
    return unicastOnlyFetch(input, init);
  };
  installedFetches.add(guarded);
  globalThis.fetch = guarded;
};

export const withSsrfProtection = <T>(fn: () => Promise<T>): Promise<T> => {
  ensureGuardInstalled();
  return activeRequest.run(true, fn);
};
