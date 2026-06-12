/**
 * M11 — pure People & audit logic, table-driven (charter item 8):
 * presence derivation (the M6 actors-active-today rule, per-person),
 * audit composition (kind→family fold, filters, search, ranges, day
 * grouping, per-source composers).
 */
import { describe, expect, it } from "vitest";

import { feedEventKind } from "@/src/db/schema";
import {
  KIND_CONNECTOR,
  KIND_TONE,
  KIND_WORD,
  KIND_WORD_CLASS,
} from "@/src/domain/feed/kinds";
import {
  actorCandidates,
  activeToday,
  lastActiveAt,
  todayStart,
  type ActorActivity,
} from "@/src/domain/people/presence";
import {
  AUDIT_FAMILIES,
  AUDIT_FILTER_LABEL,
  AUDIT_FILTERS,
  FAMILY_STYLE,
  KIND_FAMILY,
  dayGroupLabel,
  feedRowToAudit,
  groupByDay,
  inRange,
  kindChipLabel,
  matchesFilter,
  matchesQuery,
  parseAuditFilter,
  parseAuditRange,
  rangeStart,
  sessionRowToAudit,
  sortAuditEvents,
  tokenToAuditEvents,
  type AuditEvent,
} from "@/src/domain/audit/events";

const NOW = new Date("2026-06-12T15:30:00");

// ── feed-kind vocabulary stays exhaustive ──────────────────────────────

describe("M11 feed kinds", () => {
  it("every enum value has word/tone/class entries (exhaustive records)", () => {
    for (const kind of feedEventKind.enumValues) {
      expect(KIND_WORD[kind], kind).toBeTruthy();
      expect(KIND_TONE[kind], kind).toBeTruthy();
      expect(KIND_WORD_CLASS[kind], kind).toBeTruthy();
    }
  });

  it("M11 kinds carry the §1.1 tones — sky social, rose destructive", () => {
    expect(KIND_TONE["invited"]).toBe("sky");
    expect(KIND_TONE["member-added"]).toBe("sky");
    expect(KIND_TONE["member-removed"]).toBe("rose");
    expect(KIND_TONE["profile-changed"]).toBe("stone");
  });

  it("withdraw/decline sentences read through their connector", () => {
    expect(
      `you ${KIND_WORD["invite-revoked"]} ${KIND_CONNECTOR["invite-revoked"]} dev@acme.io`,
    ).toBe("you withdrew the invite for dev@acme.io");
  });
});

// ── presence (charter item 4) ──────────────────────────────────────────

describe("presence derivation", () => {
  const ada = { displayName: "Ada", handle: "ada-h", email: "ada@acme.io" };
  const owner = { displayName: "Onkesh", email: "onkesh19@gmail.com", isOwner: true };

  it.each([
    [ada, ["ada", "ada-h", "ada@acme.io"]],
    [owner, ["onkesh", "onkesh19@gmail.com", "onkesh19", "you"]],
  ])("candidates are lowercased identities", (person, expected) => {
    expect(actorCandidates(person)).toEqual(expect.arrayContaining(expected));
  });

  it("matches the newest identity hit, case-insensitively", () => {
    const activity: ActorActivity = new Map([
      ["ada", new Date("2026-06-12T09:00:00")],
      ["ada@acme.io", new Date("2026-06-12T11:00:00")],
    ]);
    expect(lastActiveAt(ada, activity)?.toISOString()).toBe(
      new Date("2026-06-12T11:00:00").toISOString(),
    );
  });

  it("the Owner's 'you' rows count as the Owner's activity", () => {
    const activity: ActorActivity = new Map([["you", new Date("2026-06-12T08:00:00")]]);
    expect(activeToday(owner, activity, todayStart(NOW))).toBe(true);
    expect(activeToday(ada, activity, todayStart(NOW))).toBe(false);
  });

  it("yesterday's activity is not presence today", () => {
    const activity: ActorActivity = new Map([["ada", new Date("2026-06-11T23:59:00")]]);
    expect(activeToday(ada, activity, todayStart(NOW))).toBe(false);
    expect(lastActiveAt(ada, activity)).not.toBeNull();
  });

  it("no activity → null, never a fake timestamp", () => {
    expect(lastActiveAt(ada, new Map())).toBeNull();
  });
});

// ── audit composition (charter item 5) ─────────────────────────────────

describe("audit kind→family fold", () => {
  it("every feed kind folds into a TT family; every family is styled", () => {
    for (const kind of feedEventKind.enumValues) {
      expect(AUDIT_FAMILIES, kind).toContain(KIND_FAMILY[kind]);
    }
    for (const family of AUDIT_FAMILIES) {
      expect(FAMILY_STYLE[family].dot).toMatch(/^bg-/);
      expect(FAMILY_STYLE[family].text).toMatch(/^text-/);
    }
  });

  it.each([
    ["shipped", "merge"], // §1.1 state-merge: the audit row is ABOUT the landing
    ["member-removed", "danger"], // TT:144 "Removed Sam …"
    ["member-added", "invite"],
    ["bridge-revoked", "danger"],
    ["profile-changed", "settings"],
    ["filed", "ticket"],
  ] as const)("%s → %s", (kind, family) => {
    expect(KIND_FAMILY[kind]).toBe(family);
  });
});

function event(over: Partial<AuditEvent>): AuditEvent {
  return {
    id: "feed-1",
    at: NOW,
    family: "ticket",
    kindLabel: "FILED",
    actor: "ada",
    title: "Filed T-1 — a thing",
    ...over,
  };
}

describe("audit filters (TT:182–188 made real)", () => {
  it("labels cover every filter", () => {
    for (const f of AUDIT_FILTERS) expect(AUDIT_FILTER_LABEL[f]).toBeTruthy();
  });

  it.each([
    ["everything", "ticket", true],
    ["security", "sign-in", true],
    ["security", "invite", true],
    ["security", "danger", true],
    ["security", "ticket", false],
    ["work", "merge", true],
    ["work", "result", true],
    ["work", "settings", false],
    ["settings", "settings", true],
    ["danger", "danger", true],
    ["danger", "invite", false],
  ] as const)("filter %s vs family %s → %s", (filter, family, expected) => {
    expect(matchesFilter(event({ family }), filter)).toBe(expected);
  });

  it("unknown params parse to safe defaults", () => {
    expect(parseAuditFilter(undefined)).toBe("everything");
    expect(parseAuditFilter("nope")).toBe("everything");
    expect(parseAuditRange(undefined)).toBe("30d");
    expect(parseAuditRange("nope")).toBe("30d");
  });
});

describe("audit search", () => {
  const e = event({
    actor: "Priya",
    kindLabel: "DISPATCHED",
    title: "Dispatched R-12 — Ship Group dispatch",
    meta: "atlas-internal",
  });
  it.each([
    ["", true],
    ["priya", true],
    ["priya dispatch", true], // every term must hit
    ["priya nonexistent", false],
    ["ATLAS-INTERNAL", true],
    ["carmen", false],
  ])("q=%j → %s", (q, expected) => {
    expect(matchesQuery(e, q)).toBe(expected);
  });
});

describe("audit ranges + day groups", () => {
  it("today starts at local midnight; all has no start", () => {
    expect(rangeStart("today", NOW)?.getHours()).toBe(0);
    expect(rangeStart("all", NOW)).toBeNull();
  });

  it.each([
    [new Date("2026-06-12T01:00:00"), "today", true],
    [new Date("2026-06-11T23:00:00"), "today", false],
    [new Date("2026-06-06T15:30:00"), "7d", true],
    [new Date("2026-06-04T15:30:00"), "7d", false],
    [new Date("2025-01-01T00:00:00"), "all", true],
  ] as const)("%s in range %s → %s", (at, range, expected) => {
    expect(inRange(event({ at: new Date(at) }), range, NOW)).toBe(expected);
  });

  it("group labels read Today / Yesterday / bare stamp (TT:37 form)", () => {
    expect(dayGroupLabel(new Date("2026-06-12T10:00:00"), NOW)).toBe("Today · Fri Jun 12");
    expect(dayGroupLabel(new Date("2026-06-11T10:00:00"), NOW)).toBe("Yesterday · Thu Jun 11");
    expect(dayGroupLabel(new Date("2026-06-08T10:00:00"), NOW)).toBe("Mon Jun 8");
  });

  it("groups consecutive same-day events; order preserved", () => {
    const groups = groupByDay(
      [
        event({ id: "a", at: new Date("2026-06-12T10:00:00") }),
        event({ id: "b", at: new Date("2026-06-12T09:00:00") }),
        event({ id: "c", at: new Date("2026-06-11T09:00:00") }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.events.length)).toEqual([2, 1]);
  });

  it("sort is newest-first with a stable tiebreak", () => {
    const sorted = sortAuditEvents([
      event({ id: "feed-1", at: new Date("2026-06-12T09:00:00") }),
      event({ id: "feed-2", at: new Date("2026-06-12T10:00:00") }),
    ]);
    expect(sorted[0].id).toBe("feed-2");
  });
});

describe("per-source composers", () => {
  it("feed rows lead with the verb and carry preview as detail", () => {
    const composed = feedRowToAudit(
      {
        id: 812,
        kind: "shipped",
        actor: "Engine",
        summary: "T-249 — Add JSON export endpoint",
        preview: "Try the JSON option.",
        ticketRef: "T-249",
        projectName: "acme-website",
        createdAt: NOW,
      },
      "shipped",
      undefined,
    );
    expect(composed).toMatchObject({
      id: "feed-812",
      family: "merge",
      kindLabel: "SHIPPED",
      title: "Shipped T-249 — Add JSON export endpoint",
      detail: "Try the JSON option.",
      meta: "acme-website · T-249",
    });
  });

  it("sessions become SIGN IN rows with the humanized client", () => {
    const composed = sessionRowToAudit({
      id: "s1",
      createdAt: NOW,
      ipAddress: "86.0.215.42",
      client: "Chrome · Windows",
      actor: "Onkesh",
    });
    expect(composed.family).toBe("sign-in");
    expect(composed.title).toBe("Signed in from Chrome · Windows");
    expect(composed.meta).toBe("86.0.215.42");
  });

  it("tokens derive created-or-rotated + revoked — never a fake history", () => {
    const events = tokenToAuditEvents({
      id: "t1",
      name: "ci-runner",
      prefix: "atp_94ac…",
      scopes: ["tickets:read"],
      createdAt: new Date("2026-06-10T10:00:00"),
      revokedAt: new Date("2026-06-11T10:00:00"),
    });
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe('API token "ci-runner" created or last rotated');
    expect(events[1].family).toBe("danger");
    expect(tokenToAuditEvents({
      id: "t2",
      name: "x",
      prefix: "atp_…",
      scopes: ["*"],
      createdAt: NOW,
      revokedAt: null,
    })).toHaveLength(1);
  });

  it("kind chips read as spaced uppercase", () => {
    expect(kindChipLabel("member-removed")).toBe("MEMBER REMOVED");
  });
});
