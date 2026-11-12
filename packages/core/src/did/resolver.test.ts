import { describe, expect, it } from "vitest";

import { BadGatewayError, NotFoundError } from "../errors.js";
import { createMemoryDidCache } from "./cache/memory.js";
import type { Did } from "./did.js";
import { createPdsResolver } from "./resolver.js";

const DID: Did = "did:plc:z72i7hdynmk6r22z27h6tvur";

const resolverWith = (didFetch: typeof fetch) =>
  createPdsResolver({
    plcDirectoryUrl: "https://plc.directory",
    didCache: createMemoryDidCache(),
    didFetch,
  });

const didDocument = (service: unknown[]) =>
  Response.json(
    { "@context": ["https://www.w3.org/ns/did/v1"], id: DID, service },
    { headers: { "content-type": "application/did+ld+json" } },
  );

describe("createPdsResolver", () => {
  it("returns the pds endpoint in the did document", async () => {
    const resolver = resolverWith(() =>
      Promise.resolve(
        didDocument([
          {
            id: "#atproto_pds",
            type: "AtprotoPersonalDataServer",
            serviceEndpoint: "https://pds.example.com",
          },
        ]),
      ),
    );

    await expect(resolver.resolvePdsEndpoint(DID)).resolves.toEqual(
      new URL("https://pds.example.com"),
    );
  });

  it.each([404, 410])(
    "throws NotFoundError when the plc directory responds %i",
    async (status) => {
      const resolver = resolverWith(() =>
        Promise.resolve(new Response(null, { status })),
      );

      await expect(resolver.resolvePdsEndpoint(DID)).rejects.toThrow(
        NotFoundError,
      );
    },
  );

  it("throws NotFoundError when the did document has no pds", async () => {
    const resolver = resolverWith(() => Promise.resolve(didDocument([])));

    await expect(resolver.resolvePdsEndpoint(DID)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws BadGatewayError when the plc directory responds 5xx", async () => {
    const resolver = resolverWith(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    );

    await expect(resolver.resolvePdsEndpoint(DID)).rejects.toThrow(
      BadGatewayError,
    );
  });

  it("throws BadGatewayError when the request to the plc directory fails", async () => {
    const resolver = resolverWith(() =>
      Promise.reject(new TypeError("fetch failed")),
    );

    await expect(resolver.resolvePdsEndpoint(DID)).rejects.toThrow(
      BadGatewayError,
    );
  });
});
