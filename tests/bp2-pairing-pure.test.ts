/**
 * BP2 — Pure tests for the click-to-pair loopback gate (ADR-0004 §4).
 * Tests: validateCallbackUrl + validatePairState (pure, no DB) and
 * the contract shape that the approve server action must emit.
 * No network, no Neon, no Next server.
 */
import { describe, expect, it } from "vitest";

import {
  generateBridgeToken,
  hashBridgeToken,
  validateBridgeName,
  validateCallbackUrl,
  validatePairState,
} from "@/src/domain/bridge/pairing";

// ── validateCallbackUrl ───────────────────────────────────────────────────────

describe("validateCallbackUrl — loopback gate (ADR-0004 §4)", () => {
  it("accepts 127.0.0.1", () => {
    const r = validateCallbackUrl("http://127.0.0.1:12345/callback");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url.hostname).toBe("127.0.0.1");
      expect(r.url.port).toBe("12345");
    }
  });

  it("accepts localhost", () => {
    const r = validateCallbackUrl("http://localhost:9999/callback");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("localhost");
  });

  it("accepts localhost with path and no trailing slash", () => {
    const r = validateCallbackUrl("http://localhost:8080/cb");
    expect(r.ok).toBe(true);
  });

  it("rejects empty string", () => {
    const r = validateCallbackUrl("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/required/i);
  });

  it("rejects a non-URL string", () => {
    const r = validateCallbackUrl("not-a-url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/valid url/i);
  });

  it("rejects a public IP (hard security gate)", () => {
    const r = validateCallbackUrl("http://192.168.1.100:12345/callback");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/loopback/i);
  });

  it("rejects a remote domain (hard security gate)", () => {
    const r = validateCallbackUrl("http://evil.example.com:12345/callback");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/loopback/i);
  });

  it("rejects https (only http on loopback is accepted)", () => {
    const r = validateCallbackUrl("https://127.0.0.1:12345/callback");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/http/i);
  });

  it("rejects 0.0.0.0 (not a loopback address)", () => {
    const r = validateCallbackUrl("http://0.0.0.0:12345/callback");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/loopback/i);
  });

  it("rejects [::1] IPv6 loopback (not in the accepted set)", () => {
    // ADR-0004 §4 specifies 127.0.0.1 / localhost only; IPv6 loopback
    // is a follow-up hardening item if needed.
    const r = validateCallbackUrl("http://[::1]:12345/callback");
    expect(r.ok).toBe(false);
  });

  it("preserves the port on the returned URL object", () => {
    const r = validateCallbackUrl("http://127.0.0.1:54321/path");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url.port).toBe("54321");
      expect(r.url.pathname).toBe("/path");
    }
  });
});

// ── validatePairState ─────────────────────────────────────────────────────────

describe("validatePairState — nonce guard (ADR-0004 §4)", () => {
  it("accepts a normal nonce", () => {
    const r = validatePairState("abc123nonce");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state).toBe("abc123nonce");
  });

  it("accepts a UUID-style nonce", () => {
    const r = validatePairState("550e8400-e29b-41d4-a716-446655440000");
    expect(r.ok).toBe(true);
  });

  it("rejects null", () => {
    const r = validatePairState(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/required/i);
  });

  it("rejects undefined", () => {
    const r = validatePairState(undefined);
    expect(r.ok).toBe(false);
  });

  it("rejects empty string", () => {
    const r = validatePairState("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/required/i);
  });

  it("rejects whitespace-only", () => {
    const r = validatePairState("   ");
    expect(r.ok).toBe(false);
  });

  it("rejects overly long state (>512 chars)", () => {
    const r = validatePairState("x".repeat(513));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/long/i);
  });

  it("echoes the state verbatim (no trimming of significant content)", () => {
    const nonce = "state-nonce-with-special-!@#$%^";
    const r = validatePairState(nonce);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state).toBe(nonce);
  });
});

// ── redirect contract shape (pure derivation; ADR-0004 §4) ───────────────────

describe("ADR-0004 §4 redirect URL contract", () => {
  it("redirect URL carries token+state+name on a validated loopback cb", () => {
    // Simulate what approveAction does after minting — pure URL construction.
    const cbResult = validateCallbackUrl("http://127.0.0.1:54321/callback");
    const stateResult = validatePairState("abc-nonce-123");
    const nameResult = validateBridgeName("my-machine");

    expect(cbResult.ok).toBe(true);
    expect(stateResult.ok).toBe(true);
    expect(nameResult.ok).toBe(true);

    if (!cbResult.ok || !stateResult.ok || !nameResult.ok) return;

    const token = generateBridgeToken();
    const target = cbResult.url;
    target.searchParams.set("token", token);
    target.searchParams.set("state", stateResult.state);
    target.searchParams.set("name", nameResult.name);

    const redirectUrl = target.toString();
    const parsed = new URL(redirectUrl);
    expect(parsed.searchParams.get("token")).toBe(token);
    expect(parsed.searchParams.get("state")).toBe("abc-nonce-123");
    expect(parsed.searchParams.get("name")).toBe("my-machine");
    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.port).toBe("54321");
    expect(parsed.pathname).toBe("/callback");
  });

  it("state is echoed unmodified even when it contains special characters", () => {
    const state = "nonce=with+special&chars=true";
    const cbResult = validateCallbackUrl("http://127.0.0.1:9999/cb");
    const stateResult = validatePairState(state);
    expect(stateResult.ok).toBe(true);
    if (!cbResult.ok || !stateResult.ok) return;

    const target = cbResult.url;
    target.searchParams.set("state", stateResult.state);
    const parsed = new URL(target.toString());
    // URL.searchParams round-trips through percent-encoding; the decoded
    // value must match the original.
    expect(parsed.searchParams.get("state")).toBe(state);
  });
});

// ── token properties (retained from M10 — unchanged) ─────────────────────────

describe("bridge token properties (inherited from M10)", () => {
  it("generates the documented format: atlas-bridge- + 48 hex", () => {
    const token = generateBridgeToken();
    expect(token).toMatch(/^atlas-bridge-[0-9a-f]{48}$/);
  });

  it("two tokens never collide", () => {
    expect(generateBridgeToken()).not.toBe(generateBridgeToken());
  });

  it("hash is sha-256 hex, deterministic, never the plaintext", () => {
    const token = generateBridgeToken();
    const hash = hashBridgeToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashBridgeToken(token));
    expect(hash).not.toContain(token);
  });
});
