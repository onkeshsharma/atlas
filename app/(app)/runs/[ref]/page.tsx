/**
 * M9 Session B — Run detail: ONE route rendering by state (the K/V/RR
 * routing decision, recorded in HANDOFF-M9):
 *
 *   queued / running / needs-input → RR (the live page)
 *   review-ready                   → redirect to ./diff (KK — review
 *                                    and ship are one motion, PRD #25)
 *   shipped                        → V
 *   failed                         → K
 *   cancelled                      → quiet stone record (no variant)
 *
 * RR:366's own footnote names the design: "the page swaps to the
 * summary". LiveRefresh keeps the swap live — a finishing run re-renders
 * the server tree and the route changes face without a reload.
 */
import { notFound, redirect } from "next/navigation";

import { LiveRefresh } from "@/src/components/live/LiveRefresh";
import { requireOwner } from "@/src/domain/auth/guard";
import { latestBriefForTicket } from "@/src/domain/dispatch/queries";
import { latestCursor } from "@/src/domain/live/broker";
import { queuedRuns, runDetailByRef } from "@/src/domain/run/detail";
import { stdoutLines, stdoutTail } from "@/src/domain/run/stdout";

import { RunCancelled } from "./run-cancelled";
import { RunFailed } from "./run-failed";
import { RunLive } from "./run-live";
import { RunShipped } from "./run-shipped";

export const dynamic = "force-dynamic";

/** K:185 / V:238 — the post-mortem pages show a stdout TAIL. */
const TAIL_LINES = 14;

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requireOwner();
  const { ref } = await params;
  const detail = await runDetailByRef(decodeURIComponent(ref));
  if (!detail) notFound();

  if (detail.run.state === "review-ready") {
    redirect(`/runs/${detail.run.ref}/diff`);
  }

  const cursor = await latestCursor();

  switch (detail.run.state) {
    case "shipped": {
      const stdout = await stdoutTail(detail.run.id, TAIL_LINES);
      return (
        <>
          <LiveRefresh since={cursor} />
          <RunShipped detail={detail} stdout={stdout} />
        </>
      );
    }
    case "failed": {
      const stdout = await stdoutTail(detail.run.id, TAIL_LINES);
      return (
        <>
          <LiveRefresh since={cursor} />
          <RunFailed detail={detail} stdout={stdout} />
        </>
      );
    }
    case "cancelled": {
      const stdout = await stdoutTail(detail.run.id, TAIL_LINES);
      return (
        <>
          <LiveRefresh since={cursor} />
          <RunCancelled detail={detail} stdout={stdout} />
        </>
      );
    }
    default: {
      const [stdout, queued, brief] = await Promise.all([
        stdoutLines(detail.run.id),
        queuedRuns(detail.run.id),
        detail.ticket ? latestBriefForTicket(detail.ticket.id) : Promise.resolve(null),
      ]);
      return (
        <>
          <LiveRefresh since={cursor} />
          <RunLive detail={detail} brief={brief} stdout={stdout} queued={queued} />
        </>
      );
    }
  }
}
