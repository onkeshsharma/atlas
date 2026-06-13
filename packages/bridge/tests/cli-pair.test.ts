/**
 * BP1 — tests for `atlas-bridge pair` (the ADR-0004 §4 loopback client):
 *
 *   1. Full happy path: fake Atlas 302s a token → config written, token
 *      never logged, state validated.
 *   2. State mismatch → rejected (no config write, exit 1 path).
 *   3. Headless fallback: when openBrowser returns false, pair exits 1
 *      with manual instructions.
 *
 * The "fake Atlas" for these tests is an in-process HTTP server that
 * simulates the /settings/bridges/pair → 302-to-callback flow.
 * It does NOT use the full FakeAtlas (which tests the daemon protocol) —
 * it only needs to redirect the browser to the CLI's callback URL.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { buildPairUrl, runPair, pickFreePort } from "../src/cli/pair.ts";
import { readConfigFile } from "../src/config-file.ts";

// ──────────────────────────────────────────────────────
// Helper: a mini fake-Atlas pair-approval server.
// It receives the browser redirect to /settings/bridges/pair,
// extracts the `cb` and `state` query params, and immediately
// 302s to `cb/callback?token=<tok>&state=<state>&name=<name>`.
// ──────────────────────────────────────────────────────

type FakePairAtlasOpts = {
  /** If true, sends a WRONG state back. */
  poisonState?: boolean;
  /** If true, omits the token entirely. */
  omitToken?: boolean;
};

class FakePairAtlas {
  server: Server | null = null;
  port = 0;
  lastSeenToken: string | null = null;
  readonly issuedToken = `atp_${randomBytes(16).toString("hex")}`;
  private opts: FakePairAtlasOpts;

  constructor(opts: FakePairAtlasOpts = {}) {
    this.opts = opts;
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<void> {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("listening", resolve);
      this.server!.once("error", reject);
      this.server!.listen({ port: 0, host: "127.0.0.1" });
    });
    const addr = this.server.address();
    if (addr && typeof addr === "object") this.port = addr.port;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    if (!req.url) {
      res.writeHead(404).end();
      return;
    }
    const url = new URL(req.url, this.url);

    // Simulate the pair approve page handling
    if (url.pathname === "/settings/bridges/pair") {
      const cb = url.searchParams.get("cb");
      const state = url.searchParams.get("state");
      const name = url.searchParams.get("name");
      if (!cb || !state) {
        res.writeHead(400).end("missing cb or state");
        return;
      }
      const redirectState = this.opts.poisonState
        ? "WRONG_STATE_" + randomBytes(4).toString("hex")
        : state;
      const callbackUrl = new URL(`${cb}`);
      if (!this.opts.omitToken) {
        callbackUrl.searchParams.set("token", this.issuedToken);
        this.lastSeenToken = this.issuedToken;
      }
      callbackUrl.searchParams.set("state", redirectState);
      if (name) callbackUrl.searchParams.set("name", name);
      res.writeHead(302, { Location: callbackUrl.toString() }).end();
      return;
    }

    res.writeHead(404).end("not found");
  }
}

// ──────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────

let tmpDir: string;
let fakeAtlas: FakePairAtlas;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "bp1-pair-"));
});

afterEach(async () => {
  await fakeAtlas?.stop().catch(() => {});
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

/**
 * Simulates "the browser follows the redirect".
 * When `openBrowser` is called with the pair URL, we:
 *   1. GET the fake Atlas's pair URL (it 302s to cb/callback?token=…)
 *   2. Then GET the callback URL so the CLI receives the token.
 */
function makeBrowserFollower(
  opts: { followRedirect?: boolean } = {},
): (url: string) => Promise<boolean> {
  return async (pairUrl: string) => {
    // Step 1: hit the fake Atlas's /settings/bridges/pair
    const step1 = await fetch(pairUrl, { redirect: "manual" });
    const location = step1.headers.get("location");
    if (!location) return false;
    if (opts.followRedirect === false) return true; // stop before callback
    // Step 2: follow the 302 → CLI callback (one-shot listener)
    await fetch(location, { redirect: "manual" }).catch(() => {
      // callback server may have closed — that's fine
    });
    return true;
  };
}

// ──────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────

describe("pair — ADR-0004 §4 loopback client", () => {
  it("buildPairUrl: produces the exact ADR-0004 §4 shape", () => {
    const url = buildPairUrl({
      atlasUrl: "https://atlas.example.com",
      machineName: "work-laptop",
      callbackBase: "http://127.0.0.1:54321",
      state: "abc123",
    });
    const parsed = new URL(url);
    expect(parsed.hostname).toBe("atlas.example.com");
    expect(parsed.pathname).toBe("/settings/bridges/pair");
    expect(parsed.searchParams.get("name")).toBe("work-laptop");
    expect(parsed.searchParams.get("cb")).toBe("http://127.0.0.1:54321/callback");
    expect(parsed.searchParams.get("state")).toBe("abc123");
  });

  it("happy path: config written, token never logged, state echoed correctly", async () => {
    fakeAtlas = new FakePairAtlas();
    await fakeAtlas.start();

    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
      ATLAS_URL: fakeAtlas.url,
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await runPair({
        name: "test-machine",
        url: fakeAtlas.url,
        env,
        openBrowser: makeBrowserFollower(),
        silent: false,
      });

      // 1. Config was written
      const cfg = await readConfigFile(env);
      expect(cfg).not.toBeNull();
      expect(cfg?.name).toBe("test-machine");
      expect(cfg?.url).toBe(fakeAtlas.url);
      // Token must be in the file (it was written)
      expect(typeof cfg?.token).toBe("string");
      expect(cfg?.token?.length).toBeGreaterThan(10);

      // 2. Token NEVER printed / logged (ADR-0004 hard rule)
      const allOutput = [
        ...logSpy.mock.calls.flat(),
        ...errSpy.mock.calls.flat(),
      ].join(" ");
      expect(allOutput).not.toContain(fakeAtlas.issuedToken);
      // Also confirm the token isn't in console output even partially
      expect(allOutput).not.toContain("atp_");
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  it("state mismatch: rejects — config not written", async () => {
    fakeAtlas = new FakePairAtlas({ poisonState: true });
    await fakeAtlas.start();

    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
    };

    // runPair will call process.exit(1) if it detects a mismatch via
    // the rejectToken path — but since we catch the Promise rejection,
    // we can assert config was NOT written.
    await expect(
      runPair({
        name: "bad-machine",
        url: fakeAtlas.url,
        env,
        openBrowser: makeBrowserFollower(),
        silent: true,
      }),
    ).rejects.toThrow(/state mismatch/i);

    // Config was not written
    const cfg = await readConfigFile(env);
    expect(cfg).toBeNull();
  });

  it("headless fallback: exits 1 when browser cannot open", async () => {
    const env: NodeJS.ProcessEnv = {
      ATLAS_BRIDGE_HOME: tmpDir,
    };

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error(`process.exit(${_code})`);
    });

    try {
      await expect(
        runPair({
          name: "headless",
          url: "https://atlas.example.com",
          env,
          openBrowser: async () => false, // headless — browser not available
          silent: true,
        }),
      ).rejects.toThrow();

      // process.exit(1) was called
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("pickFreePort returns a port in the valid range", async () => {
    const port = await pickFreePort();
    expect(port).toBeGreaterThan(1023);
    expect(port).toBeLessThanOrEqual(65535);
  });
});
