/**
 * M10 — API-token pure logic (charter item 9): hashing, prefix, scope
 * validation, expiry math, standing. Table-driven; no DB.
 */
import { describe, expect, it } from "vitest";

import {
  API_TOKEN_SCOPES,
  expiresLabel,
  expiryDate,
  generateApiToken,
  hashApiToken,
  tokenPrefix,
  tokenStanding,
  validateScopes,
  validateTokenName,
} from "@/src/domain/tokens/api-tokens";

describe("token generation + hashing", () => {
  it("generates the documented format: atp_ + 48 hex", () => {
    const token = generateApiToken();
    expect(token).toMatch(/^atp_[0-9a-f]{48}$/);
  });

  it("two tokens never collide", () => {
    expect(generateApiToken()).not.toBe(generateApiToken());
  });

  it("hash is sha-256 hex, deterministic, and never the plaintext", () => {
    const token = generateApiToken();
    const hash = hashApiToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashApiToken(token));
    expect(hash).not.toContain(token);
  });

  it("prefix shows enough to recognise, never enough to use", () => {
    const token = "atp_0123456789abcdef0123456789abcdef0123456789abcdef";
    expect(tokenPrefix(token)).toBe("atp_0123…");
    expect(tokenPrefix(token).length).toBeLessThan(12);
  });
});

describe("scope validation", () => {
  const cases: Array<{ name: string; input: string[]; ok: boolean; message?: string }> = [
    { name: "one known scope", input: ["tickets:read"], ok: true },
    { name: "several known scopes", input: ["tickets:read", "tickets:write"], ok: true },
    { name: "duplicates collapse", input: ["runs:read", "runs:read"], ok: true },
    { name: "star alone", input: ["*"], ok: true },
    { name: "empty set", input: [], ok: false, message: "pick at least one scope" },
    { name: "unknown scope", input: ["bridges:write"], ok: false, message: "unknown scope" },
    {
      name: "star must stand alone",
      input: ["*", "tickets:read"],
      ok: false,
      message: "the everything-scope stands alone",
    },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const result = validateScopes(c.input);
      expect(result.ok).toBe(c.ok);
      if (!result.ok && c.message) expect(result.message).toBe(c.message);
    });
  }

  it("every documented scope validates", () => {
    for (const scope of API_TOKEN_SCOPES) {
      expect(validateScopes([scope]).ok).toBe(true);
    }
  });
});

describe("name validation", () => {
  it("trims and accepts a sane label", () => {
    const result = validateTokenName("  ci-runner · github-actions  ");
    expect(result).toEqual({ ok: true, name: "ci-runner · github-actions" });
  });
  it("rejects empty", () => {
    expect(validateTokenName("   ").ok).toBe(false);
  });
  it("rejects >80 chars", () => {
    expect(validateTokenName("x".repeat(81)).ok).toBe(false);
  });
});

describe("expiry", () => {
  const now = new Date("2026-06-12T12:00:00Z");

  it("uses the chosen window", () => {
    expect(expiryDate(30, now).getTime() - now.getTime()).toBe(30 * 86_400_000);
    expect(expiryDate(365, now).getTime() - now.getTime()).toBe(365 * 86_400_000);
  });

  it("unknown windows fall back to 90 days", () => {
    expect(expiryDate(7, now).getTime() - now.getTime()).toBe(90 * 86_400_000);
  });

  const labelCases: Array<[string, string]> = [
    ["2026-09-12T12:00:00Z", "in 92 days"],
    ["2026-06-13T12:00:00Z", "in 1 day"],
    ["2026-06-12T15:00:00Z", "in 3 hours"],
    ["2026-06-12T12:00:30Z", "in 1 hour"], // sub-hour floors to the honest minimum
    ["2026-06-12T11:00:00Z", "expired"],
  ];
  for (const [iso, expected] of labelCases) {
    it(`labels ${iso} as "${expected}" (XX:180's bare form)`, () => {
      expect(expiresLabel(new Date(iso), now)).toBe(expected);
    });
  }

  it("standing: revoked beats expired beats active", () => {
    const future = new Date(now.getTime() + 86_400_000);
    const past = new Date(now.getTime() - 1);
    expect(tokenStanding({ revokedAt: null, expiresAt: future }, now)).toBe("active");
    expect(tokenStanding({ revokedAt: null, expiresAt: past }, now)).toBe("expired");
    expect(tokenStanding({ revokedAt: past, expiresAt: future }, now)).toBe("revoked");
    expect(tokenStanding({ revokedAt: past, expiresAt: past }, now)).toBe("revoked");
  });
});
