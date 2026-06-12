/**
 * M16 — "Insights as CSV" (OO:379–387 made real). Pure serializer over
 * the same InsightsData the page renders — the export IS the page's
 * numbers, never a second derivation. Durations export as raw ms +
 * fractional hours (machine-honest; display words stay in the UI).
 */
import { formatDuration, type InsightsRange } from "./derive";
import type { InsightsData } from "./queries";

function esc(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(...cells: Array<string | number | null>): string {
  return cells.map(esc).join(",");
}

const hours = (ms: number) => Math.round((ms / 3_600_000) * 100) / 100;

export function insightsCsv(data: InsightsData): string {
  const lines: string[] = [];
  lines.push(row("atlas insights", data.window.label, data.now.toISOString()));
  lines.push("");

  lines.push(row("summary", "value"));
  lines.push(row("tickets shipped", data.throughput.totalShipped));
  lines.push(row("runs failed", data.throughput.totalFailed));
  lines.push(row("runs cancelled", data.outcomes.cancelled));
  lines.push(
    row("median time-to-ship", data.medianMs === null ? null : formatDuration(data.medianMs)),
  );
  lines.push(row("median time-to-ship (ms)", data.medianMs));
  lines.push(row("measured filed→shipped pairs", data.pairCount));
  lines.push(row("failure rate (%)", data.outcomes.failureRatePct));
  lines.push(row("helper runs", data.helpers.helper));
  lines.push(row("owner runs", data.helpers.owner));
  lines.push("");

  lines.push(row("week", "shipped", "failed"));
  for (const bar of data.throughput.bars) {
    lines.push(row(bar.label, bar.shipped, bar.failed));
  }
  lines.push("");

  lines.push(row("percentile", "ms", "hours"));
  for (const p of data.percentiles) {
    lines.push(row(p.label, p.ms, hours(p.ms)));
  }
  lines.push("");

  lines.push(row("project", "shipped", "failed", "share (%)", "avg time-to-ship (hours)"));
  for (const p of data.projects) {
    lines.push(row(p.name, p.shipped, p.failed, p.sharePct, p.avgMs === null ? null : hours(p.avgMs)));
  }
  lines.push("");

  lines.push(row("straggler", "title", "state", "project", "in state since", "age (hours)"));
  for (const s of data.stragglers) {
    lines.push(
      row(s.ref, s.title, s.state, s.projectName, s.enteredStateAt.toISOString(), hours(s.ageMs)),
    );
  }
  return lines.join("\n") + "\n";
}

export function insightsCsvFilename(range: InsightsRange): string {
  return `atlas-insights-${range}.csv`;
}
