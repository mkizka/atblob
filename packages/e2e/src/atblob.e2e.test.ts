import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cidFor, createTestImage } from "./fixtures.js";
import { request, startCli } from "./local-server.js";
import { setupMockUpstream } from "./upstream.js";

// These tests drive the real, wired-up product (runCli -> hono -> @atblob/core)
// over real HTTP, with only the outbound PLC/PDS calls replaced by a scripted
// upstream (see upstream.ts for why). Everything else - routing, DID
// resolution, blob fetching, CID verification, the in-memory blob cache and
// the sharp-based image transform - runs for real.

const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("atblob e2e", () => {
  it("resolves the did, fetches the blob from the pds, and returns a resized image", async () => {
    const bytes = await createTestImage({ width: 400, height: 200 });
    const cid = await cidFor(bytes);
    const upstream = await setupMockUpstream({ did: DID });
    upstream.serveBlob(cid, bytes);
    const cli = await startCli();

    try {
      const res = await request(
        cli.port,
        `/img/avatar_thumbnail/plain/${DID}/${cid}`,
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/webp");
      expect(res.headers["cache-control"]).toBe("public, max-age=31536000");
      const metadata = await sharp(res.body).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(128);
      expect(metadata.height).toBe(128);
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("re-encodes into the format requested via the @format suffix", async () => {
    const bytes = await createTestImage({ width: 400, height: 200 });
    const cid = await cidFor(bytes);
    const upstream = await setupMockUpstream({ did: DID });
    upstream.serveBlob(cid, bytes);
    const cli = await startCli();

    try {
      const res = await request(
        cli.port,
        `/img/avatar/plain/${DID}/${cid}@jpeg`,
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/jpeg");
      const metadata = await sharp(res.body).metadata();
      expect(metadata.format).toBe("jpeg");
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("returns 404 when the did does not resolve", async () => {
    const cid = await cidFor(await createTestImage());
    const upstream = await setupMockUpstream({ did: DID, didResolves: false });
    const cli = await startCli();

    try {
      const res = await request(cli.port, `/img/avatar/plain/${DID}/${cid}`);

      expect(res.status).toBe(404);
      expect(res.headers["cache-control"]).toBe("public, max-age=60");
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("returns 404 when the pds does not have the blob", async () => {
    const cid = await cidFor(await createTestImage());
    const upstream = await setupMockUpstream({ did: DID });
    upstream.failBlob(cid, 404);
    const cli = await startCli();

    try {
      const res = await request(cli.port, `/img/avatar/plain/${DID}/${cid}`);

      expect(res.status).toBe(404);
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("returns 502 when the pds is unavailable", async () => {
    const cid = await cidFor(await createTestImage());
    const upstream = await setupMockUpstream({ did: DID });
    upstream.failBlob(cid, 500);
    const cli = await startCli();

    try {
      const res = await request(cli.port, `/img/avatar/plain/${DID}/${cid}`);

      expect(res.status).toBe(502);
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("returns 404 when the fetched bytes don't match the requested cid", async () => {
    const requestedCid = await cidFor(
      await createTestImage({ background: { r: 255, g: 0, b: 0 } }),
    );
    const differentBytes = await createTestImage({
      background: { r: 0, g: 255, b: 0 },
    });
    const upstream = await setupMockUpstream({ did: DID });
    upstream.serveBlob(requestedCid, differentBytes);
    const cli = await startCli();

    try {
      const res = await request(
        cli.port,
        `/img/avatar/plain/${DID}/${requestedCid}`,
      );

      expect(res.status).toBe(404);
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });

  it("serves a repeated request from the in-memory blob cache instead of fetching the pds again", async () => {
    const bytes = await createTestImage();
    const cid = await cidFor(bytes);
    const upstream = await setupMockUpstream({ did: DID });
    upstream.serveBlob(cid, bytes);
    const cli = await startCli(["--blob-cache-ttl", "60000"]);

    try {
      const first = await request(cli.port, `/img/avatar/plain/${DID}/${cid}`);
      const second = await request(cli.port, `/img/avatar/plain/${DID}/${cid}`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
      expect(upstream.getBlobCallCount(cid)).toBe(1);
    } finally {
      await cli.stop();
      await upstream.close();
    }
  });
});
