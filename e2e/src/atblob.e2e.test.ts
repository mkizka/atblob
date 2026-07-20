import sharp from "sharp";
import { aroundAll, describe, expect, it, vi } from "vitest";

import { request, startCli } from "./local-server.js";
import { startTestRedis } from "./redis-container.js";
import { type MockUpstream, setupMockUpstream } from "./upstream.js";

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";

describe("atblob e2e", () => {
  let cliPort: number;
  let upstream: MockUpstream;

  aroundAll(async (runSuite) => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await using redis = await startTestRedis();
      await using cli = await startCli([
        "--did-cache",
        "redis",
        "--redis-url",
        redis.url,
      ]);
      using mockUpstream = setupMockUpstream({ did: DID });
      cliPort = cli.port;
      upstream = mockUpstream;

      await runSuite();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("resolves the did, fetches the blob from the pds, and returns a resized image", async () => {
    const cid = await upstream.serveBlob({ width: 400, height: 200 });

    const res = await request(
      cliPort,
      `/img/avatar_thumbnail/plain/${DID}/${cid}`,
    );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/webp");
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000");
    const metadata = await sharp(res.body).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(128);
    expect(metadata.height).toBe(128);
  });

  it("returns 400 for an unknown preset", async () => {
    // preset is validated before the cid, so it need not be registered.
    const res = await request(
      cliPort,
      `/img/not_a_real_preset/plain/${DID}/unused`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed cid", async () => {
    const res = await request(
      cliPort,
      `/img/avatar_thumbnail/plain/${DID}/not-a-valid-cid`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when the did fails to resolve", async () => {
    const unknownDid = "did:plc:doesnotexist000000000000";
    const cid = await upstream.unregisteredCid();

    const res = await request(
      cliPort,
      `/img/avatar_thumbnail/plain/${unknownDid}/${cid}`,
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 when the pds has no blob for the cid", async () => {
    const cid = await upstream.unregisteredCid();

    const res = await request(
      cliPort,
      `/img/avatar_thumbnail/plain/${DID}/${cid}`,
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 when the fetched blob's hash doesn't match the cid", async () => {
    // Unlike the "no blob for the cid" case above, the pds mock here
    // responds with 200 and real bytes - only atblob's own cid
    // verification can catch that they don't hash to the requested cid.
    const cid = await upstream.serveBlobWithMismatchedCid();

    const res = await request(
      cliPort,
      `/img/avatar_thumbnail/plain/${DID}/${cid}`,
    );

    expect(res.status).toBe(404);
  });
});
