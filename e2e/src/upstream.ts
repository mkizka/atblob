import { http, HttpResponse, passthrough } from "msw";
import { setupServer } from "msw/node";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import sharp from "sharp";

// atblob wraps its outbound fetch calls with SSRF protection (https-only,
// unicast-only), so a local http server can never stand in for a real PDS
// or PLC directory by address alone - hence the msw mocks below, which
// intercept globalThis.fetch itself rather than a real network address.
const LOCAL_SERVER_PATTERN = /^http:\/\/127\.0\.0\.1:\d+\//;

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

const createTestImage = (
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> =>
  sharp({
    create: {
      width: opts.width ?? 400,
      height: opts.height ?? 200,
      channels: 3,
      background: { r: 0, g: 128, b: 255 },
    },
  })
    .png()
    .toBuffer();

const cidFor = async (bytes: Uint8Array): Promise<string> => {
  const digest = await sha256.digest(bytes);
  return CID.createV1(raw.code, digest).toString();
};

export type MockUpstream = Disposable & {
  serveBlob: (opts?: { width?: number; height?: number }) => Promise<string>;
  // A syntactically valid cid never registered with the pds mock, so
  // getBlob replies 404 - simulates a blob missing on the real pds.
  unregisteredCid: () => Promise<string>;
  // Registers a real image under a cid it doesn't actually hash to - the pds
  // mock happily serves it, so only our own cid verification can catch it.
  serveBlobWithMismatchedCid: () => Promise<string>;
};

export const setupMockUpstream = (opts: { did: string }): MockUpstream => {
  const blobReplies = new Map<string, Uint8Array>();

  const server = setupServer(
    http.get(`${PLC_DIRECTORY_URL}/${encodeURIComponent(opts.did)}`, () =>
      HttpResponse.json(didDocumentFor(opts.did, PDS_URL), {
        headers: { "content-type": "application/did+ld+json" },
      }),
    ),
    http.get(
      `${PLC_DIRECTORY_URL}/*`,
      () => new HttpResponse("did not found", { status: 404 }),
    ),
    http.get(`${PDS_URL}/xrpc/com.atproto.sync.getBlob`, ({ request }) => {
      const cid = new URL(request.url).searchParams.get("cid") ?? "";
      const bytes = blobReplies.get(cid);
      if (!bytes) {
        return new HttpResponse("no mock registered for this cid", {
          status: 404,
        });
      }
      return new HttpResponse(bytes, {
        headers: { "content-type": "image/png" },
      });
    }),
    // Without this, msw treats local-server.ts's own requests to the cli
    // under test as unhandled and errors on them too.
    http.all(LOCAL_SERVER_PATTERN, () => passthrough()),
  );
  server.listen({ onUnhandledRequest: "error" });

  const registerBlobAt = (cid: string, bytes: Uint8Array): string => {
    blobReplies.set(cid, bytes);
    return cid;
  };

  const serveBlob: MockUpstream["serveBlob"] = async (imageOpts) => {
    const bytes = await createTestImage(imageOpts);
    return registerBlobAt(await cidFor(bytes), bytes);
  };

  const unregisteredCid: MockUpstream["unregisteredCid"] = () =>
    cidFor(new TextEncoder().encode("unregistered"));

  const serveBlobWithMismatchedCid: MockUpstream["serveBlobWithMismatchedCid"] =
    async () => {
      const wrongCid = await cidFor(
        new TextEncoder().encode("not the real bytes"),
      );
      return registerBlobAt(
        wrongCid,
        new TextEncoder().encode("mismatched blob bytes"),
      );
    };

  return {
    serveBlob,
    unregisteredCid,
    serveBlobWithMismatchedCid,
    [Symbol.dispose]: () => {
      server.close();
    },
  };
};
