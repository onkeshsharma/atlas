/**
 * M13 — pure tier: the plain-English state mapping (exhaustive over the
 * 9-state vocabulary), the Notifier's preference gate (frequency ×
 * quiet hours × timezone × events tables), digest scheduling math, and
 * composition snapshots (subjects + key strings — never full-HTML
 * brittleness).
 */
import { describe, expect, it } from "vitest";

import { TICKET_STATES } from "@/src/domain/ticket/states";
import {
  COLLAB_FILTERS,
  COLLAB_STATE_LABEL,
  isCollabOpen,
  matchesCollabFilter,
} from "@/src/domain/collab/states";
import {
  digestSubject,
  digestPreview,
  composeDigestEmail,
} from "@/src/domain/notifier/compose-digest";
import {
  composeShipEmail,
  shipSubject,
  verifyProse,
} from "@/src/domain/notifier/compose-ship";
import {
  digestWindow,
  digestWindowLabel,
  gateDigest,
  gateShipNotification,
  inQuietWindow,
  isDigestDue,
  localParts,
  nextLocalTime,
  parseHHMM,
  periodKeyFor,
  quietDeferral,
} from "@/src/domain/notifier/gate";
import type { NotificationPrefsView } from "@/src/domain/notifications/preferences";

// ── plain-English states ───────────────────────────────────────────────

describe("COLLAB_STATE_LABEL — the plain-English mapping (PRD #43)", () => {
  it("covers every ticket state with a non-empty sentence", () => {
    for (const state of TICKET_STATES) {
      expect(COLLAB_STATE_LABEL[state], state).toBeTruthy();
    }
  });

  it("never leaks machine words to the Collaborator", () => {
    for (const state of TICKET_STATES) {
      const label = COLLAB_STATE_LABEL[state].toLowerCase();
      expect(label).not.toContain("review-ready");
      expect(label).not.toContain("needs-info");
      expect(label).not.toContain("triage");
      expect(label).not.toContain("dispatch");
    }
  });

  it("T:76–84 copy ports verbatim for the seven states T drew", () => {
    expect(COLLAB_STATE_LABEL["needs-info"]).toBe("Owner asked you a question");
    expect(COLLAB_STATE_LABEL["in-progress"]).toBe("Engine is working on it");
    expect(COLLAB_STATE_LABEL["review-ready"]).toBe("Almost done — Owner is checking");
    expect(COLLAB_STATE_LABEL.shipped).toBe("Shipped");
    expect(COLLAB_STATE_LABEL.failed).toBe("Hit a snag — Owner is figuring it out");
    expect(COLLAB_STATE_LABEL.backlog).toBe("On the backlog");
  });

  it("filters partition correctly (T:96 isOpen, 9-state form)", () => {
    expect(isCollabOpen("shipped")).toBe(false);
    expect(isCollabOpen("declined")).toBe(false);
    for (const s of ["triage", "needs-info", "backlog", "approved", "in-progress", "review-ready", "failed"] as const) {
      expect(isCollabOpen(s), s).toBe(true);
    }
    expect(COLLAB_FILTERS).toContain("waiting");
    expect(matchesCollabFilter("waiting", "needs-info")).toBe(true);
    expect(matchesCollabFilter("waiting", "in-progress")).toBe(false);
    expect(matchesCollabFilter("shipped", "shipped")).toBe(true);
    expect(matchesCollabFilter("open", "declined")).toBe(false);
    for (const s of TICKET_STATES) expect(matchesCollabFilter("everything", s)).toBe(true);
  });
});

// ── prefs helpers ──────────────────────────────────────────────────────

function prefs(overrides: Partial<NotificationPrefsView> = {}): NotificationPrefsView {
  return {
    emailEnabled: true,
    frequency: "instant",
    events: { "ticket-shipped": true, "project-shipped": false },
    quietFrom: null,
    quietUntil: null,
    timezone: "UTC",
    emailFormat: "editorial",
    ...overrides,
  };
}

// a fixed Friday noon UTC (2026-06-12 was a Friday)
const NOW = new Date("2026-06-12T12:00:00Z");

describe("gate — wall-clock helpers", () => {
  it("parseHHMM accepts 24h times only", () => {
    expect(parseHHMM("22:00")).toBe(22 * 60);
    expect(parseHHMM("08:30")).toBe(8 * 60 + 30);
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("8:30")).toBeNull();
    expect(parseHHMM("nope")).toBeNull();
  });

  it("inQuietWindow handles plain + midnight-wrapping windows", () => {
    // 09:00–17:00
    expect(inQuietWindow(10 * 60, 9 * 60, 17 * 60)).toBe(true);
    expect(inQuietWindow(17 * 60, 9 * 60, 17 * 60)).toBe(false); // edge = open
    // 22:00–08:00 wraps midnight
    expect(inQuietWindow(23 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(inQuietWindow(3 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(inQuietWindow(12 * 60, 22 * 60, 8 * 60)).toBe(false);
    // degenerate window = no window
    expect(inQuietWindow(12 * 60, 9 * 60, 9 * 60)).toBe(false);
  });

  it("localParts respects the IANA zone (Kolkata is UTC+5:30)", () => {
    const { minutes, weekday } = localParts(NOW, "Asia/Kolkata");
    expect(minutes).toBe(17 * 60 + 30);
    expect(weekday).toBe(5); // Friday
    // unknown zone falls back to UTC instead of failing the send
    expect(localParts(NOW, "Not/AZone").minutes).toBe(12 * 60);
  });

  it("nextLocalTime lands on the next wall-clock occurrence", () => {
    // 12:00 UTC → next 14:00 UTC is +2h
    expect(nextLocalTime(NOW, "UTC", 14 * 60).getTime()).toBe(NOW.getTime() + 2 * 3_600_000);
    // already past today → tomorrow
    expect(nextLocalTime(NOW, "UTC", 9 * 60).getTime()).toBe(NOW.getTime() + 21 * 3_600_000);
  });

  it("quietDeferral reads the window in the recipient's zone", () => {
    // 17:30 in Kolkata, quiet 17:00–18:00 → deferred to 18:00 local (12:30Z)
    const deferred = quietDeferral(
      NOW,
      prefs({ quietFrom: "17:00", quietUntil: "18:00", timezone: "Asia/Kolkata" }),
    );
    expect(deferred?.getTime()).toBe(NOW.getTime() + 30 * 60_000);
    // same window in UTC: 12:00 is inside → deferred 6h
    const utc = quietDeferral(NOW, prefs({ quietFrom: "11:00", quietUntil: "18:00" }));
    expect(utc?.getTime()).toBe(NOW.getTime() + 6 * 3_600_000);
    // outside the window → null
    expect(quietDeferral(NOW, prefs({ quietFrom: "22:00", quietUntil: "08:00" }))).toBeNull();
    // no window → null
    expect(quietDeferral(NOW, prefs())).toBeNull();
  });
});

describe("gateShipNotification — the frequency × events × quiet table", () => {
  it("instant + event on + no quiet window ⇒ send", () => {
    expect(gateShipNotification(prefs(), { now: NOW, isReporter: true })).toEqual({
      action: "send",
    });
  });

  it("email channel off ⇒ skip, whatever else says", () => {
    const d = gateShipNotification(prefs({ emailEnabled: false }), {
      now: NOW,
      isReporter: true,
    });
    expect(d).toEqual({ action: "skip", reason: "email channel off" });
  });

  it("frequency off ⇒ skip", () => {
    expect(
      gateShipNotification(prefs({ frequency: "off" }), { now: NOW, isReporter: true }),
    ).toEqual({ action: "skip", reason: "frequency off" });
  });

  it("the reporter is gated by ticket-shipped; others by project-shipped", () => {
    const p = prefs({ events: { "ticket-shipped": false, "project-shipped": true } });
    expect(gateShipNotification(p, { now: NOW, isReporter: true })).toEqual({
      action: "skip",
      reason: "ticket-shipped off",
    });
    expect(gateShipNotification(p, { now: NOW, isReporter: false })).toEqual({
      action: "send",
    });
    const q = prefs(); // project-shipped defaults off
    expect(gateShipNotification(q, { now: NOW, isReporter: false })).toEqual({
      action: "skip",
      reason: "project-shipped off",
    });
  });

  it("weekly frequency folds ships into the digest (skip, audited)", () => {
    expect(
      gateShipNotification(prefs({ frequency: "weekly" }), { now: NOW, isReporter: true }),
    ).toEqual({ action: "skip", reason: "weekly frequency — folded into the digest" });
  });

  it("daily frequency defers to the next 09:00 in the recipient's zone", () => {
    const d = gateShipNotification(prefs({ frequency: "daily" }), {
      now: NOW,
      isReporter: true,
    });
    expect(d.action).toBe("defer-daily");
    if (d.action === "defer-daily") {
      // 12:00 UTC → next 09:00 UTC = +21h
      expect(d.deliverAfter.getTime()).toBe(NOW.getTime() + 21 * 3_600_000);
    }
  });

  it("quiet hours outrank daily batching (compose now, deliver at the edge)", () => {
    const d = gateShipNotification(
      prefs({ frequency: "daily", quietFrom: "11:00", quietUntil: "13:00" }),
      { now: NOW, isReporter: true },
    );
    expect(d.action).toBe("defer-quiet");
    if (d.action === "defer-quiet") {
      expect(d.deliverAfter.getTime()).toBe(NOW.getTime() + 3_600_000); // 13:00Z
    }
  });
});

describe("gateDigest", () => {
  it("sends for instant/daily/weekly; off and channel-off skip", () => {
    expect(gateDigest(prefs(), { now: NOW })).toEqual({ action: "send" });
    expect(gateDigest(prefs({ frequency: "daily" }), { now: NOW })).toEqual({ action: "send" });
    expect(gateDigest(prefs({ frequency: "weekly" }), { now: NOW })).toEqual({ action: "send" });
    expect(gateDigest(prefs({ frequency: "off" }), { now: NOW }).action).toBe("skip");
    expect(gateDigest(prefs({ emailEnabled: false }), { now: NOW }).action).toBe("skip");
  });

  it("respects quiet hours at compose time", () => {
    const d = gateDigest(prefs({ quietFrom: "11:00", quietUntil: "14:00" }), { now: NOW });
    expect(d.action).toBe("defer-quiet");
  });
});

describe("digest scheduling (UTC weeks; YY's Monday 09:00)", () => {
  it("digestWindow is the last FULL Mon→Mon UTC week", () => {
    const w = digestWindow(NOW); // Friday Jun 12 → Jun 1–8
    expect(w.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(w.start.getUTCDay()).toBe(1);
    expect(w.end.getUTCDay()).toBe(1);
    // run ON a Monday → the week that just closed
    const monday = new Date("2026-06-08T09:00:00Z");
    expect(digestWindow(monday).end.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });

  it("periodKeyFor is a stable ISO week key; consecutive weeks differ", () => {
    const w = digestWindow(NOW);
    const key = periodKeyFor(w.start);
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
    const next = new Date(w.start.getTime() + 7 * 86_400_000);
    expect(periodKeyFor(next)).not.toBe(key);
    // idempotent for any moment inside the same week
    expect(periodKeyFor(new Date(w.start.getTime() + 3 * 86_400_000))).toBe(key);
  });

  it("isDigestDue = Monday ≥09:00 recipient-local", () => {
    expect(isDigestDue(new Date("2026-06-08T09:30:00Z"), "UTC")).toBe(true);
    expect(isDigestDue(new Date("2026-06-08T08:59:00Z"), "UTC")).toBe(false);
    expect(isDigestDue(new Date("2026-06-09T10:00:00Z"), "UTC")).toBe(false); // Tuesday
    // Sunday 23:00 in Auckland is already Monday 09:00+ +13h ahead? (UTC Sun 20:00 = Mon 08:00 NZST won't be due; UTC Sun 21:30 = Mon 09:30 NZST is)
    expect(isDigestDue(new Date("2026-06-07T21:30:00Z"), "Pacific/Auckland")).toBe(true);
  });

  it("digestWindowLabel reads as YY:72's stamp", () => {
    expect(digestWindowLabel(digestWindow(NOW))).toMatch(/^Week \d+ · Jun 1 → Jun 7$/);
  });
});

// ── composition snapshots (subjects + key strings) ─────────────────────

const DIFF = {
  filesChanged: 3,
  insertions: 184,
  deletions: 12,
  files: [
    { path: "src/export/json.ts", insertions: 121, deletions: 0 },
    { path: "src/export/index.ts", insertions: 41, deletions: 8 },
    { path: "src/ui/ExportMenu.tsx", insertions: 22, deletions: 4 },
  ],
};

describe("ship email composition (AA)", () => {
  it("subject per AA:52", () => {
    expect(shipSubject("Add JSON export")).toBe("Your “Add JSON export” is shipped");
  });

  it("verifyProse composes from the real diff (the V-page recipe)", () => {
    const v = verifyProse({ projectName: "acme-website", ticketTitle: "Add JSON export", diff: DIFF });
    expect(v).toContain("open acme-website");
    expect(v).toContain("“Add JSON export”");
    expect(v).toContain("3 files");
    expect(v).toContain("+184 −12");
    // no diff → no fake change-size claim
    const bare = verifyProse({ projectName: "acme-website", ticketTitle: "X", diff: null });
    expect(bare).toContain("The Owner reviewed the change");
  });

  it("html + text carry the same load-bearing strings", () => {
    const email = composeShipEmail({
      recipientName: "Carmen",
      recipientEmail: "carmen@acme.io",
      ownerName: "Onkesh",
      projectName: "acme-website",
      ticketRef: "T-249",
      ticketTitle: "Add JSON export",
      filedAgo: "3 days ago",
      prUrl: "https://github.com/acme/website/pull/142",
      diff: DIFF,
      appUrl: "https://atlas.example",
      replyToOwner: true,
      fromAddress: "ship@atlas.example",
    });
    expect(email.subject).toBe("Your “Add JSON export” is shipped");
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Carmen");
      expect(body).toContain("acme-website");
      expect(body).toContain("T-249");
      expect(body).toContain("Onkesh");
      expect(body).toContain("open acme-website");
    }
    expect(email.text).toContain("reply to this email");
    expect(email.html).toContain("what the Engine did, in plain language");
    expect(email.html).toContain("https://atlas.example/tickets/T-249");
    expect(email.html).toContain("https://atlas.example/settings/notifications");
    // mail-safety: no Tailwind classes, no scripts, inline styles only
    expect(email.html).not.toContain("class=");
    expect(email.html).not.toContain("<script");
  });

  it("without app URL / PR / reply-to, no dead links and no false promise", () => {
    const email = composeShipEmail({
      recipientName: "Carmen",
      recipientEmail: "carmen@acme.io",
      ownerName: "Onkesh",
      projectName: "acme-website",
      ticketRef: "T-249",
      ticketTitle: "Add JSON export",
      filedAgo: "3 days ago",
      prUrl: null,
      diff: null,
      appUrl: null,
      replyToOwner: false,
      fromAddress: "onboarding@resend.dev",
    });
    expect(email.html).not.toContain("href=\"\"");
    expect(email.text).not.toContain("reply to this email");
    expect(email.text).toContain("file a follow-up Ticket");
  });
});

describe("digest composition (YY)", () => {
  const SHIPS = [
    { ticketRef: "T-142", title: "Timezone crash fixed.", body: "Falls back to UTC.", meta: "Ticket T-142 · shipped Tue", fromYou: true },
    { ticketRef: "T-141", title: "New OG image.", body: "Reflects the dashboard.", meta: "Ticket T-141 · shipped Mon", fromYou: false },
  ];

  it("subject names the project when the scope is one (YY:43)", () => {
    expect(digestSubject({ ships: 4, projectNames: ["atlas-internal"] })).toBe(
      "4 things shipped on atlas-internal this week",
    );
    expect(digestSubject({ ships: 1, projectNames: ["a", "b"] })).toBe(
      "1 thing shipped across your projects this week",
    );
  });

  it("preview names their own ship when one exists (YY:50)", () => {
    expect(digestPreview({ ships: SHIPS })).toContain("the one you filed");
    expect(digestPreview({ ships: [SHIPS[1]] })).toContain("New OG image.");
    expect(digestPreview({ ships: [] })).toContain("quiet week");
  });

  it("html + text carry the digest's load-bearing strings", () => {
    const email = composeDigestEmail({
      recipientName: "Priya",
      recipientEmail: "priya@example.in",
      ownerName: "Onkesh",
      projectNames: ["atlas-internal"],
      windowLabel: "Week 24 · Jun 1 → Jun 7",
      ships: SHIPS,
      openedCount: 2,
      inReview: [{ ticketRef: "T-143", title: "Mark as not-mine" }],
      appUrl: "https://atlas.example",
      fromAddress: "hello@atlas.example",
    });
    expect(email.subject).toBe("2 things shipped on atlas-internal this week");
    expect(email.html).toContain("Morning, Priya.");
    expect(email.html).toContain("from you"); // YY:255 badge
    expect(email.html).toContain("Week 24 · Jun 1 → Jun 7");
    expect(email.html).toContain("What shipped");
    expect(email.html).toContain("notification settings →");
    expect(email.text).toContain("WHAT SHIPPED");
    expect(email.text).toContain("01. Timezone crash fixed.  [from you]");
    expect(email.text).toContain("STILL IN REVIEW");
    expect(email.html).not.toContain("class=");
  });
});
