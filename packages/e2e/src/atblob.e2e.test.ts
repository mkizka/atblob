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
    const upstream = setupMockUpstream({ did: DID });
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
});
