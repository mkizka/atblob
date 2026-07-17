import sharp from "sharp";
import { aroundAll, describe, expect, it, vi } from "vitest";

import { request, startCli } from "./local-server.js";
import { type MockUpstream, setupMockUpstream } from "./upstream.js";

// These tests drive the real, wired-up product (runCli -> hono -> @atblob/core)
// over real HTTP, with only the outbound PLC/PDS calls replaced by a scripted
// upstream (see upstream.ts for why). Everything else - routing, DID
// resolution, blob fetching, CID verification, the in-memory blob cache and
// the sharp-based image transform - runs for real.

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
      await using cli = await startCli();
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
});
