/**
 * M6 — Live protocol: the typed event vocabulary (PRD nine-deep-modules).
 *
 * Everything that flows Atlas → browser is one of these events. The
 * TRANSPORT is hidden behind this module + broker.ts
 * (docs/adr/0001-live-transport.md): today an SSE stream over the
 * feed_events outbox cursor; M9 plugs Bridge-originated events into the
 * same vocabulary without UI changes.
 *
 * Wire format: SSE frames — `id:` carries the outbox cursor (so
 * EventSource reconnects resume via Last-Event-ID), `event:` the type,
 * `data:` the JSON payload. Both ends parse through these guards.
 *
 * Prior art (read-and-rewrite, master plan §7.5): v1's
 * atlas/src/lib/user-events.ts + atlas/app/api/events/user/route.ts
 * (T41, on T27's pg_notify broker) — the frame shapes survive; the
 * pg_notify bus does not (see the ADR).
 */
import type { FeedEventKind } from "@/src/db/schema";

import {
  parseNeedsInputAnswer,
  parseNeedsInputQuestion,
  type NeedsInputAnswer,
  type NeedsInputQuestion,
} from "../run/needs-input";
import { isRunState, type RunState } from "../run/states";

/** snapshot of a feed_events row as it travels the wire. */
export type FeedEventSnapshot = {
  id: number;
  kind: FeedEventKind;
  actor: string;
  summary: string;
  preview: string | null;
  projectId: string | null;
  ticketId: string | null;
  runId: string | null;
  ticketRef: string | null;
  createdAt: string;
};

export type LiveEvent =
  | { type: "feed-appended"; cursor: number; event: FeedEventSnapshot }
  | {
      type: "run-state-changed";
      cursor: number;
      runId: string;
      projectId: string | null;
      from: RunState | null;
      to: RunState;
      at: string;
    }
  | {
      type: "needs-input-raised";
      cursor: number;
      runId: string;
      question: NeedsInputQuestion;
      at: string;
    }
  | {
      type: "needs-input-answered";
      cursor: number;
      runId: string;
      answer: NeedsInputAnswer;
      at: string;
    };

export type LiveEventType = LiveEvent["type"];

export const LIVE_EVENT_TYPES = [
  "feed-appended",
  "run-state-changed",
  "needs-input-raised",
  "needs-input-answered",
] as const satisfies readonly LiveEventType[];

/**
 * One SSE frame per event (WHATWG EventSource):
 *   id: <cursor> \n event: <type> \n data: <json> \n\n
 */
export function sseFrame(event: LiveEvent): string {
  return `id: ${event.cursor}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** comment frame keeping intermediaries from closing an idle stream. */
export function sseKeepalive(): string {
  return `: keepalive\n\n`;
}

/**
 * Browser-visible liveness beat. WHATWG EventSource cannot observe
 * comment keepalives, so browser-facing SSE routes (/api/live, per-run
 * stdout) send a real `ping` event the client's half-dead-stream
 * watchdog can hear without triggering a refresh (M9A decision 11 —
 * Next dev under load can hold a stream open while delivering nothing,
 * and EventSource only auto-reconnects when a stream ENDS).
 */
export function ssePing(): string {
  return `event: ping\ndata: {}\n\n`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parse an incoming `data:` JSON payload; null when malformed. */
export function parseLiveEvent(value: unknown): LiveEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.cursor !== "number") return null;
  switch (value.type) {
    case "feed-appended": {
      const e = value.event;
      if (!isRecord(e)) return null;
      if (typeof e.id !== "number" || typeof e.kind !== "string") return null;
      if (typeof e.actor !== "string" || typeof e.summary !== "string") return null;
      if (typeof e.createdAt !== "string") return null;
      return value as LiveEvent;
    }
    case "run-state-changed": {
      if (typeof value.runId !== "string" || typeof value.at !== "string") return null;
      if (!isRunState(value.to)) return null;
      if (value.from !== null && !isRunState(value.from)) return null;
      return value as LiveEvent;
    }
    case "needs-input-raised": {
      if (typeof value.runId !== "string" || typeof value.at !== "string") return null;
      if (!parseNeedsInputQuestion(value.question)) return null;
      return value as LiveEvent;
    }
    case "needs-input-answered": {
      if (typeof value.runId !== "string" || typeof value.at !== "string") return null;
      if (!parseNeedsInputAnswer(value.answer)) return null;
      return value as LiveEvent;
    }
    default:
      return null;
  }
}
