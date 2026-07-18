import {
  DidPlcResolver,
  DidResolver,
  type DidResolverOpts,
  DidWebResolver,
  PoorlyFormattedDidError,
  UnsupportedDidWebPathError,
} from "@atproto/identity";

const DID_WEB_DOC_PATH = "/.well-known/did.json";

class ScopedDidWebResolver extends DidWebResolver {
  constructor(
    timeout: number,
    private readonly fetch: typeof globalThis.fetch,
  ) {
    super(timeout);
  }

  override async resolveNoCheck(did: string): Promise<unknown> {
    const parts = did
      .split(":")
      .slice(2)
      .join(":")
      .split(":")
      .map(decodeURIComponent);
    if (parts.length > 1) {
      // atproto does not support did:web with a path.
      throw new UnsupportedDidWebPathError(did);
    }
    const [hostname] = parts;
    if (!hostname) {
      throw new PoorlyFormattedDidError(did);
    }
    const url = new URL(`https://${hostname}${DID_WEB_DOC_PATH}`);
    if (url.hostname === "localhost") {
      url.protocol = "http";
    }

    const res = await this.fetch(url, {
      signal: AbortSignal.timeout(this.timeout),
      redirect: "error",
      headers: { accept: "application/did+ld+json,application/json" },
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  }
}

class ScopedDidPlcResolver extends DidPlcResolver {
  constructor(
    plcUrl: string,
    timeout: number,
    private readonly fetch: typeof globalThis.fetch,
  ) {
    super(plcUrl, timeout);
  }

  override async resolveNoCheck(did: string): Promise<unknown> {
    const url = new URL(`/${encodeURIComponent(did)}`, this.plcUrl);
    const res = await this.fetch(url, {
      signal: AbortSignal.timeout(this.timeout),
      redirect: "error",
      headers: { accept: "application/did+ld+json,application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw Object.assign(new Error(res.statusText), { status: res.status });
    }
    return res.json();
  }
}

// @atproto/identity's DidResolver doesn't accept a custom fetch, so plc/web
// resolution always goes through the ambient global fetch - unacceptable
// here since the did is untrusted, attacker-supplied input (from the request
// URL). DidResolver.methods is a public map that resolveNoCheck() consults
// on every call, so replacing its "plc"/"web" entries after construction
// redirects all resolution through our scoped fetch while still reusing
// DidResolver's own caching and did-document validation.
export class ScopedDidResolver extends DidResolver {
  constructor(opts: DidResolverOpts, fetch: typeof globalThis.fetch) {
    super(opts);
    const { timeout = 3000, plcUrl = "https://plc.directory" } = opts;
    this.methods.set("plc", new ScopedDidPlcResolver(plcUrl, timeout, fetch));
    this.methods.set("web", new ScopedDidWebResolver(timeout, fetch));
  }
}
