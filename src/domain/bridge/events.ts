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
import { parseDoctorRequestPayload } from "./doctor";
import type { BridgeEvent } from "./protocol";

/**
 * @param forBridgeId M10 — the consuming daemon's bridge id. Doctor
 * requests are ADDRESSED commands (one machine's preflight, not a
 * broadcast); rows for other bridges map to nothing. Run commands stay
 * broadcast — M9's single-bridge semantics unchanged.
 */
export function rowToBridgeEvents(row: FeedEvent, forBridgeId?: string): BridgeEvent[] {
  // M10 — the doctor command row has no runId; handle it first.
  if (row.kind === "doctor-requested") {
    const payload = parseDoctorRequestPayload(row.payload);
    if (!payload) return [];
    if (forBridgeId !== undefined && payload.bridgeId !== forBridgeId) return [];
    return [
      {
        type: "bridge-doctor",
        cursor: row.id,
        bridgeId: payload.bridgeId,
        projects: payload.projects,
        keepWorktreeRunIds: payload.keepWorktreeRunIds,
      },
    ];
  }

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
