/**
 * M6 — Live protocol: SSE frame shape, parse guards, and the pure
 * outbox-row → LiveEvents mapping (docs/adr/0001-live-transport.md).
 */
import { describe, expect, it } from "vitest";

import type { FeedEvent } from "@/src/db/schema";
import { rowToLiveEvents } from "@/src/domain/live/broker";
import {
  parseLiveEvent,
  sseFrame,
  sseKeepalive,
  type LiveEvent,
} from "@/src/domain/live/events";

const AT = new Date("2026-06-11T04:20:00.000Z");

function feedRow(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    id: 41,
    kind: "shipped",
    actor: "Engine",
    summary: "T-249 — Add JSON export endpoint",
    preview: null,
    projectId: "p-1",
    ticketId: "t-1",
    runId: null,
    ticketRef: "T-249",
    payload: null,
    readAt: null,
    seeded: false,
    createdAt: AT,
    ...overrides,
  };
}

describe("SSE frames", () => {
  it("frame carries id (cursor) + event type + JSON data", () => {
    const event: LiveEvent = {
      type: "feed-appended",
      cursor: 41,
      event: {
        id: 41,
        kind: "shipped",
        actor: "Engine",
        summary: "T-249 — Add JSON export endpoint",
        preview: null,
        projectId: "p-1",
        ticketId: "t-1",
        runId: null,
        ticketRef: "T-249",
        createdAt: AT.toISOString(),
      },
    };
    const frame = sseFrame(event);
    expect(frame).toBe(`id: 41\nevent: feed-appended\ndata: ${JSON.stringify(event)}\n\n`);
    // and the data line round-trips through the parser
    const data = JSON.parse(frame.split("\ndata: ")[1].trimEnd());
    expect(parseLiveEvent(data)).toEqual(event);
  });

  it("keepalive is a comment frame", () => {
    expect(sseKeepalive()).toBe(`: keepalive\n\n`);
  });
});

describe("parseLiveEvent guards", () => {
  it("rejects unknown types, missing cursors, bad states", () => {
    expect(parseLiveEvent(null)).toBeNull();
    expect(parseLiveEvent({ type: "feed-appended" })).toBeNull();
    expect(parseLiveEvent({ type: "stdout-chunk", cursor: 1 })).toBeNull();
    expect(
      parseLiveEvent({ type: "run-state-changed", cursor: 1, runId: "r", to: "exploded", from: null, at: "t" }),
    ).toBeNull();
    expect(
      parseLiveEvent({ type: "needs-input-raised", cursor: 1, runId: "r", at: "t", question: { kind: "shout" } }),
    ).toBeNull();
  });

  it("accepts a valid run-state-changed", () => {
    const event = {
      type: "run-state-changed",
      cursor: 7,
      runId: "r-1",
      projectId: "p-1",
      from: "running",
      to: "needs-input",
      at: AT.toISOString(),
    };
    expect(parseLiveEvent(event)).toEqual(event);
  });
});

describe("rowToLiveEvents — outbox row mapping", () => {
  it("a plain feed row maps to feed-appended only", () => {
    const events = rowToLiveEvents(feedRow());
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("feed-appended");
    expect(events[0].cursor).toBe(41);
  });

  it("a run-transition row also emits run-state-changed", () => {
    const events = rowToLiveEvents(
      feedRow({ kind: "started", runId: "r-1", payload: { from: "queued", to: "running" } }),
    );
    expect(events.map((e) => e.type)).toEqual(["feed-appended", "run-state-changed"]);
    const change = events[1];
    if (change.type !== "run-state-changed") throw new Error("unreachable");
    expect(change.from).toBe("queued");
    expect(change.to).toBe("running");
    expect(change.runId).toBe("r-1");
  });

  it("a needs-input row raises the dedicated event with the validated question", () => {
    const question = {
      kind: "question",
      prompt: "Inline the theme script in <head>?",
      raisedAt: AT.toISOString(),
    };
    const events = rowToLiveEvents(
      feedRow({
        kind: "needs-input",
        runId: "r-1",
        payload: { from: "running", to: "needs-input", question },
      }),
    );
    expect(events.map((e) => e.type)).toEqual([
      "feed-appended",
      "run-state-changed",
      "needs-input-raised",
    ]);
    const raised = events[2];
    if (raised.type !== "needs-input-raised") throw new Error("unreachable");
    expect(raised.question).toEqual(question);
  });

  it("an answered row emits needs-input-answered with the validated answer", () => {
    const answer = { choice: "Active only", answeredBy: "you", answeredAt: AT.toISOString() };
    const events = rowToLiveEvents(
      feedRow({
        kind: "answered",
        runId: "r-1",
        payload: { from: "needs-input", to: "running", answer },
      }),
    );
    expect(events.map((e) => e.type)).toEqual([
      "feed-appended",
      "run-state-changed",
      "needs-input-answered",
    ]);
  });

  it("malformed payloads degrade to feed-appended — never a lying event", () => {
    const events = rowToLiveEvents(
      feedRow({ kind: "needs-input", runId: "r-1", payload: { from: "running", to: "nope" } }),
    );
    expect(events.map((e) => e.type)).toEqual(["feed-appended"]);
  });
});
