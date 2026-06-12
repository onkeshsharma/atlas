/**
 * M13 — the Notifier's preference gate (charter item 2: honor
 * `notificationPrefs` COMPLETELY). Pure decisions over injected clocks —
 * every branch is table-tested (frequency × quiet hours × timezone ×
 * events).
 *
 * THE FREQUENCY RULING (recorded — CC's segment maps onto the two real
 * notification kinds):
 *   instant → ship emails send on the event; the weekly digest also
 *             sends (YY: per-Ticket pings AND the Monday round-up
 *             coexist — AA "are the default").
 *   daily   → ship emails compose immediately but HOLD until the next
 *             09:00 in the recipient's zone (status `composed` +
 *             deliver_after — the day's ships arrive as a morning
 *             batch); digest sends.
 *   weekly  → ship emails are folded into the digest (status
 *             skipped-pref — the audit shows the decision); digest sends.
 *   off     → nothing sends (ship + digest rows land as skipped-pref).
 *
 * THE QUIET-HOURS RULING (charter: "compose now, mark
 * skipped-quiet-hours and deliver at the window edge"): a send decision
 * inside the window becomes skipped-quiet-hours with deliver_after at
 * the next window end; the cron pass (ADR-0003) delivers it there.
 * Window-edge arithmetic is wall-clock in the recipient's IANA zone via
 * Intl — a DST jump inside the window shifts the edge by the offset
 * delta (accepted; the window is a comfort feature, not a contract).
 */
import type { NotificationPrefsView } from "@/src/domain/notifications/preferences";

export type GateDecision =
  | { action: "send" }
  | { action: "defer-quiet"; deliverAfter: Date }
  | { action: "defer-daily"; deliverAfter: Date }
  | { action: "skip"; reason: string };

// ── wall-clock helpers (pure; Intl does the zone math) ────────────────

/** minutes-since-midnight + ISO weekday (1 = Monday … 7 = Sunday) in `tz`. */
export function localParts(now: Date, tz: string | null): { minutes: number; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz ?? "UTC",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);
  } catch {
    // unknown zone string — fall back to UTC rather than failing the send
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24; // "24:xx" → 0:xx (Intl quirk)
  const minute = Number(get("minute"));
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekday = weekdayNames.indexOf(get("weekday")) + 1 || 7;
  return { minutes: hour * 60 + minute, weekday };
}

export function parseHHMM(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** is `nowMin` inside [from, until)? Handles windows that wrap midnight. */
export function inQuietWindow(nowMin: number, fromMin: number, untilMin: number): boolean {
  if (fromMin === untilMin) return false; // degenerate window = no window
  if (fromMin < untilMin) return nowMin >= fromMin && nowMin < untilMin;
  return nowMin >= fromMin || nowMin < untilMin; // wraps midnight
}

/** minutes from `nowMin` forward to `targetMin` on the wall clock (0 → 1440). */
function minutesUntil(nowMin: number, targetMin: number): number {
  const d = (targetMin - nowMin + 1440) % 1440;
  return d === 0 ? 1440 : d;
}

/** the next moment the recipient's wall clock reads `targetMin`. */
export function nextLocalTime(now: Date, tz: string | null, targetMin: number): Date {
  const { minutes } = localParts(now, tz);
  return new Date(now.getTime() + minutesUntil(minutes, targetMin) * 60_000);
}

/** quiet-window check straight off the prefs row. */
export function quietDeferral(now: Date, prefs: NotificationPrefsView): Date | null {
  if (!prefs.quietFrom || !prefs.quietUntil) return null;
  const from = parseHHMM(prefs.quietFrom);
  const until = parseHHMM(prefs.quietUntil);
  if (from === null || until === null) return null;
  const { minutes } = localParts(now, prefs.timezone);
  if (!inQuietWindow(minutes, from, until)) return null;
  return nextLocalTime(now, prefs.timezone, until);
}

// ── the gates ──────────────────────────────────────────────────────────

const DAILY_BATCH_MIN = 9 * 60; // ships held under `daily` arrive at 09:00 local

export function gateShipNotification(
  prefs: NotificationPrefsView,
  opts: { now: Date; isReporter: boolean },
): GateDecision {
  if (!prefs.emailEnabled) return { action: "skip", reason: "email channel off" };
  if (prefs.frequency === "off") return { action: "skip", reason: "frequency off" };
  const eventKey = opts.isReporter ? "ticket-shipped" : "project-shipped";
  if (!prefs.events[eventKey]) return { action: "skip", reason: `${eventKey} off` };
  if (prefs.frequency === "weekly")
    return { action: "skip", reason: "weekly frequency — folded into the digest" };

  const quietUntil = quietDeferral(opts.now, prefs);
  if (quietUntil) return { action: "defer-quiet", deliverAfter: quietUntil };

  if (prefs.frequency === "daily")
    return {
      action: "defer-daily",
      deliverAfter: nextLocalTime(opts.now, prefs.timezone, DAILY_BATCH_MIN),
    };
  return { action: "send" };
}

export function gateDigest(prefs: NotificationPrefsView, opts: { now: Date }): GateDecision {
  if (!prefs.emailEnabled) return { action: "skip", reason: "email channel off" };
  if (prefs.frequency === "off") return { action: "skip", reason: "frequency off" };
  const quietUntil = quietDeferral(opts.now, prefs);
  if (quietUntil) return { action: "defer-quiet", deliverAfter: quietUntil };
  return { action: "send" };
}

// ── digest scheduling (UTC weeks; YY — "lands every Monday 09:00") ────

/** the digested window: the most recent FULL Mon-00:00→Mon-00:00 UTC week. */
export function digestWindow(now: Date): { start: Date; end: Date } {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  // back up to Monday (getUTCDay: Sun=0 … Sat=6)
  const day = end.getUTCDay();
  end.setUTCDate(end.getUTCDate() - ((day + 6) % 7));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}

/** ISO-8601 week key of the window's start — "2026-W23". */
export function periodKeyFor(windowStart: Date): string {
  // ISO week: Thursday of the same week decides the week-year.
  const d = new Date(windowStart);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday 09:00+ in the recipient's zone (YY's "Mon 09:00" delivery promise). */
export function isDigestDue(now: Date, tz: string | null): boolean {
  const { minutes, weekday } = localParts(now, tz);
  return weekday === 1 && minutes >= DAILY_BATCH_MIN;
}

/** "Week 24 · Jun 1 → 7" — YY:72's window stamp, from the real window. */
export function digestWindowLabel(window: { start: Date; end: Date }): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
  const lastDay = new Date(window.end.getTime() - 86_400_000);
  const week = periodKeyFor(window.start).split("-W")[1];
  return `Week ${Number(week)} · ${fmt(window.start)} → ${fmt(lastDay)}`;
}
