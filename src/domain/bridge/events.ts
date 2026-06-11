/**
 * M9 — outbox rows → Bridge commands (ADR-0002 §2: no second event
 * store; the feed outbox IS the command log). Sibling of the browser
 * mapping in src/domain/live/broker.ts — same rows, the daemon's
 * vocabulary. `dispatched` → run-available, `cancelled` → run-cancelled,
 * `answered` → run-answered (the answer rides the row's payload, written
 * there by src/domain/run/bridge-writers.ts answerRun).
 */
import type { FeedEvent } from "@/src/db/schema";

import { parseNeedsInputAnswer } from "../run/needs-input";
import type { BridgeEvent } from "./protocol";

export function rowToBridgeEvents(row: FeedEvent): BridgeEvent[] {
  if (!row.runId) return [];
  const payload =
    typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : null;

  switch (row.kind) {
    case "dispatched": {
      const lane = payload?.lane === "helper" ? "helper" : "owner";
      return [{ type: "run-available", cursor: row.id, runId: row.runId, lane }];
    }
    case "cancelled":
      return [{ type: "run-cancelled", cursor: row.id, runId: row.runId }];
    case "ship-requested":
      // Session B — the Owner approved (KK CTA); the daemon ships from
      // the run's kept worktree (requestShipRun wrote this row).
      return [{ type: "run-ship", cursor: row.id, runId: row.runId }];
    case "answered": {
      const answer = parseNeedsInputAnswer(payload?.answer);
      return answer
        ? [{ type: "run-answered", cursor: row.id, runId: row.runId, answer }]
        : [];
    }
    default:
      return [];
  }
}
