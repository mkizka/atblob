import http from "node:http";

import { createRenderer } from "@atblob/core";
import { Agent, getGlobalDispatcher, Pool, setGlobalDispatcher } from "undici";

// atblob installs SSRF protection on the global fetch dispatcher, which
// refuses to connect to loopback/private hosts and only allows https - so a
// local http server can never stand in for a real PDS or PLC directory by
// address alone.
//
// Node's native global fetch() also doesn't reliably honor an undici
// MockAgent registered from the npm "undici" package: Node bundles its own
// internal copy of undici for fetch(), and when the installed package
// version differs from that internal one, MockAgent's request matching
// silently falls through to the real network instead of throwing. atblob's
// own SSRF Agent (blob/ssrf.ts) doesn't hit this problem because it only
// relies on the plain `Agent({ factory })` hook, which native fetch() does
// honor across that version boundary. So we reuse that same mechanism here:
// a custom Agent redirects the well-known upstream hostnames to a real local
// http server that plays PDS and PLC directory.
//
// installSsrfProtection() only ever installs itself once per process (it's
// a module-level no-op after the first call), and createRenderer() is what
// triggers it. Left alone, the first test in a file to start the cli would
// have its dispatcher silently overwritten by the real SSRF agent right as
// runCli() calls createRenderer(), clobbering whatever this module set up.
// So we install it ourselves, once, up front - after that, createRenderer()
// calls made by runCli() in every test are no-ops and our dispatcher sticks.
let ssrfProtectionWarmedUp: Promise<void> | undefined;
const warmUpSsrfProtection = async (): Promise<void> => {
  ssrfProtectionWarmedUp ??= (async () => {
    const renderer = await createRenderer({ didCache: "memory" });
    await renderer[Symbol.asyncDispose]();
  })();
  await ssrfProtectionWarmedUp;
};

export const PLC_DIRECTORY_URL = "https://plc.directory";
export const PDS_URL = "https://pds.test";

// A real Multikey test fixture (from @atproto/identity's own test suite) so
// that @atproto/identity's did-document parsing succeeds.
const TEST_SIGNING_KEY = "zQ3shXjHeiBuRCKmM36cuYnm7YEMzhGnCmCyW92sRJ9pribSF";

const didDocumentFor = (did: string, pdsUrl: string) => ({
  "@context": ["https://www.w3.org/ns/did/v1"],
  id: did,
  alsoKnownAs: ["at://alice.test"],
  verificationMethod: [
    {
      id: `${did}#atproto`,
      type: "Multikey",
      controller: did,
      publicKeyMultibase: TEST_SIGNING_KEY,
    },
  ],
  service: [
    {
      id: "#atproto_pds",
      type: "AtprotoPersonalDataServer",
      serviceEndpoint: pdsUrl,
    },
  ],
});

export type MockUpstream = {
  did: string;
  pdsUrl: string;
  serveBlob: (cid: string, bytes: Uint8Array, contentType?: string) => void;
  close: () => Promise<void>;
};

export const setupMockUpstream = async (opts: {
  did: string;
  pdsUrl?: string;
}): Promise<MockUpstream> => {
  await warmUpSsrfProtection();

  const pdsUrl = opts.pdsUrl ?? PDS_URL;
  const didPath = `/${encodeURIComponent(opts.did)}`;
  const blobReplies = new Map<
    string,
    { bytes: Uint8Array; contentType: string }
  >();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === didPath) {
      res
        .writeHead(200, { "content-type": "application/did+ld+json" })
        .end(JSON.stringify(didDocumentFor(opts.did, pdsUrl)));
      return;
    }

    if (url.pathname === "/xrpc/com.atproto.sync.getBlob") {
      const cid = url.searchParams.get("cid") ?? "";
      const reply = blobReplies.get(cid);
      if (!reply) {
        res.writeHead(404).end("no mock registered for this cid");
        return;
      }
      res
        .writeHead(200, { "content-type": reply.contentType })
        .end(Buffer.from(reply.bytes));
      return;
    }

    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("failed to determine the mock upstream server's port");
  }
  const localOrigin = `http://127.0.0.1:${address.port}`;

  const plcHostname = new URL(PLC_DIRECTORY_URL).hostname;
  const pdsHostname = new URL(pdsUrl).hostname;
  const previousDispatcher = getGlobalDispatcher();
  const agent = new Agent({
    factory: (origin, poolOpts) => {
      const { hostname } = origin instanceof URL ? origin : new URL(origin);
      if (hostname === plcHostname || hostname === pdsHostname) {
        return new Pool(localOrigin, poolOpts);
      }
      throw new Error(`unmocked upstream host in e2e test: ${hostname}`);
    },
  });
  setGlobalDispatcher(agent);

  const serveBlob: MockUpstream["serveBlob"] = (cid, bytes, contentType) => {
    blobReplies.set(cid, { bytes, contentType: contentType ?? "image/png" });
  };

  return {
    did: opts.did,
    pdsUrl,
    serveBlob,
    close: async () => {
      setGlobalDispatcher(previousDispatcher);
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
};
