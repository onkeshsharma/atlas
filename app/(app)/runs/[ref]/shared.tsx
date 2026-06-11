/**
 * M9 Session B — shared run-detail presentation helpers (K/V/RR are one
 * route rendering by state; these keep their ports consistent).
 */
import Link from "next/link";

import type { TrackStep, TrackTone } from "@/src/components/kit";
import type { RunDetail } from "@/src/domain/run/detail";
import { milestoneAt } from "@/src/domain/run/detail";

/**
 * Breadcrumb (K:89 / V:84 / RR:104) — v2's work surfaces are
 * instance-wide, so "Projects · acme-website · T-247 · Job j-501"
 * adapts to the M8 breadcrumb idiom (HANDOFF-M8 deviation 1):
 * "Tickets · T-247 · R-501". Helper runs breadcrumb through Projects.
 */
export function runBreadcrumb(detail: RunDetail): string {
  return detail.ticket
    ? `Tickets · ${detail.ticket.ref} · ${detail.run.ref}`
    : `Projects · ${detail.project.name} · ${detail.run.ref}`;
}

/** "4m 12s" (K:12 duration). */
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** elapsed between two milestones — null until both exist. */
export function runDuration(detail: RunDetail): string | null {
  const started = milestoneAt(detail.milestones, "started");
  if (!started) return null;
  const end = detail.run.updatedAt;
  return fmtDuration(end.getTime() - started.getTime());
}

/**
 * The rail state track (K:233–276 / V:278–321) from REAL milestones —
 * the outbox wrote one row per transition, so every node has its
 * timestamp. Steps mirror the run's actual path (a ship-failed run
 * shows its review-ready stop; the variants' three-node track is the
 * no-review path of the same recipe).
 */
export function runTrackSteps(
  detail: RunDetail,
  shortAgo: (d: Date) => string,
): { steps: TrackStep[]; tone: TrackTone } {
  const { run, milestones } = detail;
  const at = (kind: Parameters<typeof milestoneAt>[1]) => {
    const date = milestoneAt(milestones, kind);
    return date ? shortAgo(date) : null;
  };

  const steps: TrackStep[] = [
    { key: "queued", label: "Queued", status: "done", at: at("dispatched") ?? shortAgo(run.createdAt) },
  ];
  const started = milestoneAt(milestones, "started");
  const sawReview = milestoneAt(milestones, "review-ready");

  if (run.state === "queued") {
    steps[0].status = "current";
    steps.push({ key: "running", label: "Running", status: "pending", at: null });
    steps.push({ key: "review", label: "Review", status: "pending", at: null });
    return { steps, tone: "amber" };
  }

  steps.push({
    key: "running",
    label: run.state === "needs-input" ? "Needs input" : "Running",
    status: started ? (["running", "needs-input"].includes(run.state) ? "current" : "done") : "pending",
    at: at("started"),
  });

  if (sawReview || run.state === "review-ready") {
    steps.push({
      key: "review",
      label: "Review",
      status: run.state === "review-ready" ? "current" : "done",
      at: at("review-ready"),
    });
  }

  switch (run.state) {
    case "shipped":
      steps.push({ key: "shipped", label: "Shipped", status: "current", at: at("shipped") });
      return { steps, tone: "emerald" };
    case "failed":
      steps.push({ key: "failed", label: "Failed", status: "current", at: at("failed") });
      return { steps, tone: "rose" };
    case "cancelled":
      steps.push({ key: "cancelled", label: "Cancelled", status: "current", at: at("cancelled") });
      return { steps, tone: "stone" };
    default:
      if (!sawReview) steps.push({ key: "review", label: "Review", status: "pending", at: null });
      return { steps, tone: "amber" };
  }
}

/** RR:383–390 — the rail meta row. K/V's run-info values read stone-900
 * with stone-700 labels (K:289–291); RR's read stone-700 on stone-500. */
export function Meta({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={strong ? "text-stone-700" : "text-stone-500"}>{label}</span>
      <span className={`font-mono ${strong ? "text-stone-900" : "text-stone-700"}`}>{value}</span>
    </div>
  );
}

/** K:339–353 / V:381–395 — the Linked rail section (real ticket). */
export function LinkedTicket({
  ticket,
  line,
}: {
  ticket: { ref: string; title: string };
  line: string;
}) {
  return (
    <section className="pt-4 border-t border-stone-200/80">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">Linked</div>
      <ul className="mt-4 space-y-3">
        <li className="group cursor-pointer">
          <Link href={`/tickets/${ticket.ref}`} className="block">
            <div className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
              {ticket.title}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-amber-600 transition">
              {ticket.ref} · {line}
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}
