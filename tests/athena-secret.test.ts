/**
 * Secret-at-rest (ADR-0007 §3) — AES-256-GCM round-trip + fail-closed behavior.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { decryptSecret, encryptSecret, secretsAvailable } from "@/src/lib/secret";

afterEach(() => vi.unstubAllEnvs());

describe("secret", () => {
  it("round-trips, and the ciphertext never contains the plaintext", () => {
    vi.stubEnv("ATLAS_SECRET_KEY", "test-kek");
    const enc = encryptSecret("sk-ant-super-secret");
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain("sk-ant-super-secret");
    expect(decryptSecret(enc)).toBe("sk-ant-super-secret");
    expect(secretsAvailable()).toBe(true);
  });

  it("fails closed under a different KEK (tamper / wrong key)", () => {
    vi.stubEnv("ATLAS_SECRET_KEY", "kek-a");
    const enc = encryptSecret("secret");
    vi.stubEnv("ATLAS_SECRET_KEY", "kek-b");
    expect(decryptSecret(enc)).toBeNull();
  });

  it("with no KEK: unavailable, encrypt throws, decrypt returns null", () => {
    vi.stubEnv("ATLAS_SECRET_KEY", "");
    expect(secretsAvailable()).toBe(false);
    expect(() => encryptSecret("x")).toThrow();
    expect(decryptSecret("v1:a.b.c")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
});
