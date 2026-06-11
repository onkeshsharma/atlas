/**
 * M10 — doctor protocol codecs, BOTH sides (the m9-bridge-protocol
 * pattern: the daemon hand-mirrors the app vocabulary; importing both
 * here makes drift fail CI). Table-driven malformed cases per charter
 * item 9. Also covers the M10 additive fields: heartbeat `cap` echo and
 * sync `doctorRequest`.
 */
import { describe, expect, it } from "vitest";

import {
  doctorVerdict,
  parseBridgeDoctorResult,
  parseDoctorRequestPayload,
  type BridgeDoctorResult,
} from "@/src/domain/bridge/doctor";
import { rowToBridgeEvents } from "@/src/domain/bridge/events";
import {
  bridgeSseFrame,
  parseBridgeEvent as parseAppEvent,
  parseBridgeHeartbeat,
  type BridgeEvent,
} from "@/src/domain/bridge/protocol";
import type { FeedEvent } from "@/src/db/schema";

// the DAEMON side (hand-mirrored — never imports app code; protocol.ts
// is import-free, so the root config can type it directly)
import {
  parseBridgeEvent as parseDaemonEvent,
  parseSyncResponse,
} from "../packages/bridge/src/protocol";

const RESULT: BridgeDoctorResult = {
  ranAt: "2026-06-12T10:00:00.000Z",
  version: "2.0.0-m9",
  engine: "fake",
  lockPort: 9230,
  checks: [
    { key: "atlas-sync", label: "Atlas reachable · auth + DB round-trip", status: "pass", detail: "cap 2 · 0 queued" },
    { key: "git", label: "git available", status: "pass", detail: "git version 2.49.0" },
    { key: "gh", label: "GitHub CLI auth", status: "warn", detail: "gh missing or signed out — remote ships will fail honest (gh-cli-error)" },
    { key: "repo:acme", label: "repo · acme", status: "fail", detail: "C:/work/acme — not a git repository" },
  ],
};

describe("BridgeDoctorResult codec", () => {
  it("round-trips through JSON", () => {
    expect(parseBridgeDoctorResult(JSON.parse(JSON.stringify(RESULT)))).toEqual(RESULT);
  });

  const malformed: Array<[string, unknown]> = [
    ["null", null],
    ["empty object", {}],
    ["bad ranAt", { ...RESULT, ranAt: "yesterday-ish" }],
    ["bad engine", { ...RESULT, engine: "warp" }],
    ["float lockPort", { ...RESULT, lockPort: 1.5 }],
    ["empty checks", { ...RESULT, checks: [] }],
    ["check with bad status", { ...RESULT, checks: [{ key: "x", label: "x", status: "maybe", detail: null }] }],
    ["check missing label", { ...RESULT, checks: [{ key: "x", status: "pass", detail: null }] }],
    ["non-string detail", { ...RESULT, checks: [{ key: "x", label: "x", status: "pass", detail: 7 }] }],
  ];
  for (const [name, value] of malformed) {
    it(`rejects ${name}`, () => {
      expect(parseBridgeDoctorResult(value)).toBeNull();
    });
  }

  it("verdict math", () => {
    expect(doctorVerdict(RESULT)).toEqual({
      passed: 2,
      warned: 1,
      failed: 1,
      total: 4,
      healthy: false,
    });
    expect(
      doctorVerdict({ ...RESULT, checks: RESULT.checks.filter((c) => c.status !== "fail") })
        .healthy,
    ).toBe(true);
  });
});

describe("doctor request payload + outbox mapping", () => {
  const payload = {
    bridgeId: "b-1",
    projects: [{ slug: "acme", localPath: "C:/work/acme" }],
    keepWorktreeRunIds: ["r-1", "r-2"],
  };

  it("payload codec round-trips", () => {
    expect(parseDoctorRequestPayload(payload)).toEqual(payload);
    expect(parseDoctorRequestPayload({ ...payload, bridgeId: 7 })).toBeNull();
    expect(parseDoctorRequestPayload({ ...payload, projects: [{ slug: "a" }] })).toBeNull();
    expect(parseDoctorRequestPayload({ ...payload, keepWorktreeRunIds: [1] })).toBeNull();
  });

  const row = (overrides: Partial<FeedEvent>): FeedEvent =>
    ({
      id: 41,
      kind: "doctor-requested",
      actor: "you",
      summary: "doctor on onkesh-desktop",
      preview: null,
      projectId: null,
      ticketId: null,
      runId: null,
      ticketRef: null,
      payload,
      readAt: null,
      seeded: false,
      createdAt: new Date(),
      ...overrides,
    }) as FeedEvent;

  it("maps the doctor-requested row to bridge-doctor for the ADDRESSED bridge only", () => {
    const events = rowToBridgeEvents(row({}), "b-1");
    expect(events).toEqual([
      {
        type: "bridge-doctor",
        cursor: 41,
        bridgeId: "b-1",
        projects: payload.projects,
        keepWorktreeRunIds: payload.keepWorktreeRunIds,
      },
    ]);
    expect(rowToBridgeEvents(row({}), "someone-else")).toEqual([]);
  });

  it("drops a doctor row with a malformed payload", () => {
    expect(rowToBridgeEvents(row({ payload: { nope: true } }), "b-1")).toEqual([]);
  });

  it("the SSE frame round-trips through BOTH parsers (drift fence)", () => {
    const [event] = rowToBridgeEvents(row({}), "b-1");
    const frame = bridgeSseFrame(event as BridgeEvent);
    const data = JSON.parse(frame.split("data: ")[1]);
    expect(parseAppEvent(data)).toEqual(event);
    expect(parseDaemonEvent(data)).toEqual(event);
  });

  it("run commands still parse (M9 vocabulary untouched)", () => {
    const runEvent = { type: "run-available", cursor: 7, runId: "r", lane: "owner" };
    expect(parseAppEvent(runEvent)).toEqual(runEvent);
    expect(parseDaemonEvent(runEvent)).toEqual(runEvent);
  });
});

describe("M10 additive wire fields", () => {
  it("heartbeat accepts + preserves the cap echo; rejects a float", () => {
    const body = { version: "2", engine: "fake", busyRunIds: [], cap: 3 };
    expect(parseBridgeHeartbeat(body)?.cap).toBe(3);
    expect(parseBridgeHeartbeat({ ...body, cap: 2.5 })).toBeNull();
    // M9 daemons without it still parse
    expect(parseBridgeHeartbeat({ version: "2", engine: "fake", busyRunIds: [] })).not.toBeNull();
  });

  it("daemon sync parser tolerates doctorRequest absent / null / present, rejects malformed", () => {
    const base = { cursor: 1, cap: 2, queued: [], active: [], shipRequested: [] };
    expect(parseSyncResponse(base)).not.toBeNull();
    expect(parseSyncResponse({ ...base, doctorRequest: null })).not.toBeNull();
    const withReq = {
      ...base,
      doctorRequest: { projects: [{ slug: "a", localPath: "/x" }], keepWorktreeRunIds: [] },
    };
    expect(parseSyncResponse(withReq)?.doctorRequest).toEqual(withReq.doctorRequest);
    expect(parseSyncResponse({ ...base, doctorRequest: { projects: [{}], keepWorktreeRunIds: [] } })).toBeNull();
  });
});
