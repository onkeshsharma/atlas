// M5 — unit tests for the pure auth & membership logic (charter done-
// criterion 2: "unit tests for pure logic"). No DB, no network.
import { describe, expect, it } from "vitest";

import {
  daysUntilExpiry,
  deriveInviteStatus,
  generateInviteToken,
  inviteMagicLink,
} from "@/src/domain/auth/invites";
import { verifyOwnerCode } from "@/src/domain/auth/memberships";
import { isRole, ROLES } from "@/src/domain/auth/roles";

const NOW = new Date("2026-06-11T12:00:00Z");
const FUTURE = new Date("2026-06-20T12:00:00Z");
const PAST = new Date("2026-06-01T12:00:00Z");

const pending = {
  acceptedAt: null,
  revokedAt: null,
  declinedAt: null,
  expiresAt: FUTURE,
};

describe("deriveInviteStatus", () => {
  it("is pending while unclaimed and unexpired", () => {
    expect(deriveInviteStatus(pending, NOW)).toBe("pending");
  });
  it("expires exactly at expiresAt", () => {
    expect(deriveInviteStatus({ ...pending, expiresAt: NOW }, NOW)).toBe("expired");
    expect(deriveInviteStatus({ ...pending, expiresAt: PAST }, NOW)).toBe("expired");
  });
  it("accepted outranks everything, even expiry", () => {
    expect(
      deriveInviteStatus({ ...pending, acceptedAt: PAST, expiresAt: PAST }, NOW),
    ).toBe("accepted");
  });
  it("revoked outranks declined and expired", () => {
    expect(
      deriveInviteStatus(
        { ...pending, revokedAt: PAST, declinedAt: PAST, expiresAt: PAST },
        NOW,
      ),
    ).toBe("revoked");
  });
  it("declined reads declined", () => {
    expect(deriveInviteStatus({ ...pending, declinedAt: PAST }, NOW)).toBe("declined");
  });
});

describe("daysUntilExpiry", () => {
  it("rounds part-days up (an invite expiring tomorrow morning reads 1 day)", () => {
    expect(daysUntilExpiry(new Date("2026-06-12T06:00:00Z"), NOW)).toBe(1);
  });
  it("reads 9 days for the U:160 shape", () => {
    expect(daysUntilExpiry(FUTURE, NOW)).toBe(9);
  });
  it("floors at 0 once past", () => {
    expect(daysUntilExpiry(PAST, NOW)).toBe(0);
  });
});

describe("generateInviteToken / inviteMagicLink", () => {
  it("tokens are inv_-prefixed, url-safe, and unique", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).toMatch(/^inv_[A-Za-z0-9_-]{32,}$/);
    expect(a).not.toBe(b);
  });
  it("magic link lands on /invite/<token> under ATLAS_APP_URL", () => {
    expect(inviteMagicLink("inv_x", "https://atlas.example")).toBe(
      "https://atlas.example/invite/inv_x",
    );
    expect(inviteMagicLink("inv_x", "https://atlas.example/")).toBe(
      "https://atlas.example/invite/inv_x",
    );
  });
});

describe("verifyOwnerCode", () => {
  it("accepts the exact code (whitespace-trimmed)", () => {
    expect(verifyOwnerCode("ATLAS-OWNER-abc ", "ATLAS-OWNER-abc")).toBe(true);
  });
  it("rejects wrong or empty codes, and refuses when unconfigured", () => {
    expect(verifyOwnerCode("ATLAS-OWNER-abd", "ATLAS-OWNER-abc")).toBe(false);
    expect(verifyOwnerCode("", "ATLAS-OWNER-abc")).toBe(false);
    expect(verifyOwnerCode("anything", undefined)).toBe(false);
  });
});

describe("role vocabulary", () => {
  it("is exactly Owner / Collaborator (CONTEXT.md)", () => {
    expect(ROLES).toEqual(["owner", "collaborator"]);
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
  });
});
