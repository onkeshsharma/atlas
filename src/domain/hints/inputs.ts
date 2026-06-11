/**
 * M8 — Hints-engine input assembly.
 *
 * Until M9 supplies real per-Run diffs, the only file-set knowledge in
 * the system is Helper-Run enrichment `likelyFiles` (PRD #17). This
 * adapter builds the typed `fileSets` parameter from it; M9 swaps the
 * source without touching the engine (same FileSets shape).
 */
import { parseEnrichment } from "../ticket/enrichment";
import type { FileSets, HintTicket } from "./derive";

export function fileSetsFromEnrichment(
  tickets: ReadonlyArray<{ id: string; enrichment: unknown }>,
): FileSets {
  const map = new Map<string, readonly string[]>();
  for (const t of tickets) {
    const enrichment = parseEnrichment(t.enrichment);
    if (enrichment && enrichment.likelyFiles.length > 0) {
      map.set(t.id, enrichment.likelyFiles);
    }
  }
  return map;
}

export function toHintTickets(
  tickets: ReadonlyArray<{ id: string; ref: string; state: HintTicket["state"] }>,
): HintTicket[] {
  return tickets.map((t) => ({ id: t.id, ref: t.ref, state: t.state }));
}
