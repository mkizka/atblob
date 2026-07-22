import { describe, expect, it } from "vitest";

import { createMemoryDidCache } from "./cache/memory.js";
import type { Did } from "./did.js";
import type { DidFetch } from "./fetch.js";
import { createPdsResolver } from "./resolver.js";

const PLC_DIRECTORY_URL = "https://plc.directory";
const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";
const PDS_URL = "https://pds.test";

// A real Multikey test fixture (from @atproto/identity's own test suite) so
// that @atproto/identity's did-document parsing succeeds.
const TEST_SIGNING_KEY = "zQ3shXjHeiBuRCKmM36cuYnm7YEMzhGnCmCyW92sRJ9pribSF";

const didDocumentFor = (did: Did, pdsUrl: string) => ({
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

describe("createPdsResolver", () => {
  it("resolves the pds endpoint from a did document", async () => {
    const didFetch: DidFetch = () =>
      Promise.resolve(
        Response.json(didDocumentFor(DID, PDS_URL), {
          headers: { "content-type": "application/did+ld+json" },
        }),
      );
    const resolver = createPdsResolver({
      plcDirectoryUrl: PLC_DIRECTORY_URL,
      didCache: createMemoryDidCache(),
      didFetch,
    });

    const endpoint = await resolver.resolvePdsEndpoint(DID);

    expect(endpoint).toEqual(new URL(PDS_URL));
  });

  it("throws NotFoundError when the did document cannot be resolved", async () => {
    const didFetch: DidFetch = () =>
      Promise.resolve(new Response("did not found", { status: 404 }));
    const resolver = createPdsResolver({
      plcDirectoryUrl: PLC_DIRECTORY_URL,
      didCache: createMemoryDidCache(),
      didFetch,
    });

    await expect(resolver.resolvePdsEndpoint(DID)).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });
});
