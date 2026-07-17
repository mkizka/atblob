import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import sharp from "sharp";

// atblob installs SSRF protection on the global fetch dispatcher, which
// refuses to connect to loopback/private hosts and only allows https - so a
// local http server can never stand in for a real PDS or PLC directory by
// address alone. msw's fetch interceptor patches globalThis.fetch itself, so
// it intercepts requests before that dispatcher is ever consulted - no SSRF
// workaround needed here, regardless of whether atblob's SSRF protection
// installs before or after this mock server starts.

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
};

export const setupMockUpstream = (opts: { did: string }): MockUpstream => {
  const blobReplies = new Map<string, Uint8Array>();

  const server = setupServer(
    http.get(`${PLC_DIRECTORY_URL}/${encodeURIComponent(opts.did)}`, () =>
      HttpResponse.json(didDocumentFor(opts.did, PDS_URL), {
        headers: { "content-type": "application/did+ld+json" },
      }),
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
  );
  server.listen({ onUnhandledRequest: "error" });

  const serveBlob: MockUpstream["serveBlob"] = async (imageOpts) => {
    const bytes = await createTestImage(imageOpts);
    const cid = await cidFor(bytes);
    blobReplies.set(cid, bytes);
    return cid;
  };

  return {
    serveBlob,
    [Symbol.dispose]: () => {
      server.close();
    },
  };
};
