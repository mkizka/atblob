import { TestNetworkNoAppView } from "@atproto/dev-env";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import sharp from "sharp";
import { aroundAll, describe, expect, it, vi } from "vitest";

import { request, startCli } from "./local-server.js";
import { startTestRedis } from "./redis-container.js";

describe("atblob e2e", () => {
  let network: TestNetworkNoAppView;
  let redisUrl: string;
  let did: string;
  let cid: string;

  aroundAll(async (runSuite) => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await using testNetwork = await TestNetworkNoAppView.create({});
      network = testNetwork;
      await using redis = await startTestRedis();
      redisUrl = redis.url;

      const agent = network.pds.getAgent();
      const account = await agent.createAccount({
        handle: "alice.test",
        email: "alice@test.com",
        password: "password",
      });
      did = account.data.did;

      const image = await sharp({
        create: { width: 400, height: 200, channels: 3, background: "#08f" },
      })
        .png()
        .toBuffer();
      const uploaded = await agent.uploadBlob(image, {
        encoding: "image/png",
      });
      await agent.com.atproto.repo.putRecord({
        repo: did,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: { avatar: uploaded.data.blob },
      });
      cid = uploaded.data.blob.ref.toString();

      await runSuite();
    } finally {
      vi.restoreAllMocks();
    }
  });

  describe("with SSRF protection enabled", () => {
    it("returns 502 because the plc directory on a local address over http is refused", async () => {
      await using cli = await startCli([
        "--plc-directory-url",
        network.plc.url,
      ]);

      const res = await request(
        cli.port,
        `/img/avatar_thumbnail/plain/${did}/${cid}`,
      );

      expect(res.status).toBe(502);
    });

    it("returns 502 because the pds on a local address over http is refused", async () => {
      const args = [
        "--plc-directory-url",
        network.plc.url,
        "--did-cache",
        "redis",
        "--redis-url",
        redisUrl,
      ];
      const path = `/img/avatar_thumbnail/plain/${did}/${cid}`;
      {
        await using cli = await startCli([
          "--disable-ssrf-protection",
          ...args,
        ]);
        expect((await request(cli.port, path)).status).toBe(200);
      }
      await using cli = await startCli(args);

      const res = await request(cli.port, path);

      expect(res.status).toBe(502);
    });
  });

  describe("with SSRF protection disabled", () => {
    let cliPort: number;

    aroundAll(async (runSuite) => {
      await using cli = await startCli([
        "--disable-ssrf-protection",
        "--plc-directory-url",
        network.plc.url,
        "--did-cache",
        "redis",
        "--redis-url",
        redisUrl,
      ]);
      cliPort = cli.port;

      await runSuite();
    });

    it("resolves the did, fetches the blob from the pds, and returns a resized image", async () => {
      const res = await request(
        cliPort,
        `/img/avatar_thumbnail/plain/${did}/${cid}`,
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
      const res = await request(
        cliPort,
        `/img/not_a_real_preset/plain/${did}/${cid}`,
      );

      expect(res.status).toBe(400);
    });

    it("returns 400 for a malformed cid", async () => {
      const res = await request(
        cliPort,
        `/img/avatar_thumbnail/plain/${did}/not-a-valid-cid`,
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 when the did fails to resolve", async () => {
      const res = await request(
        cliPort,
        `/img/avatar_thumbnail/plain/did:plc:aaaaaaaaaaaaaaaaaaaaaaaa/${cid}`,
      );

      expect(res.status).toBe(404);
    });

    it("returns 404 when the pds has no blob for the cid", async () => {
      const digest = await sha256.digest(new TextEncoder().encode("missing"));
      const missingCid = CID.createV1(raw.code, digest).toString();

      const res = await request(
        cliPort,
        `/img/avatar_thumbnail/plain/${did}/${missingCid}`,
      );

      expect(res.status).toBe(404);
    });
  });
});
