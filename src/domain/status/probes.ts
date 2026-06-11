/**
 * M14 — the public status page's REAL signals (charter item 5).
 *
 * Three honest probes, nothing synthetic: the app served the page
 * (self-evident at render), the database answered a timed `select 1`,
 * and the live feed cursor has a newest row with a real age. Bridge
 * connectivity is deliberately NOT probed here — it is per-instance,
 * private state (the Owner's sidebar reads it; charter item 5).
 *
 * The probe functions touch the DB; everything below `composeStatus` is
 * pure and table-tested in tests/m14-public.test.ts.
 */
import { desc, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { feedEvents } from "@/src/db/schema";

export type DbProbe =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: null };

export type FeedProbe =
  | { ok: true; lastEventAt: Date | null }
  | { ok: false; lastEventAt: null };

/** timed `select 1` round-trip over the same client every page uses. */
export async function probeDatabase(): Promise<DbProbe> {
  const t0 = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

/** newest feed-outbox row — the cursor every live page streams from (ADR-0001). */
export async function probeFeed(): Promise<FeedProbe> {
  try {
    const rows = await db
      .select({ createdAt: feedEvents.createdAt })
      .from(feedEvents)
      .orderBy(desc(feedEvents.id))
      .limit(1);
    return { ok: true, lastEventAt: rows[0]?.createdAt ?? null };
  } catch {
    return { ok: false, lastEventAt: null };
  }
}

// ── pure composition (unit-tested) ─────────────────────────────────────

export type SignalState = "operational" | "unreachable";

export type StatusSignal = {
  name: string;
  state: SignalState;
  /** quiet italic note after the state word (MM:137–144). */
  note: string;
  /** right-aligned mono value (replaces MM's mock uptime %). */
  value: string;
};

export type StatusSummary = {
  /** the hero's accented word — "up." / "partly up." (MM:85–92). */
  word: "up" | "partly up";
  allGreen: boolean;
  /** the hero sub-sentence (MM:93–96), composed from the real reads. */
  sentence: string;
  signals: StatusSignal[];
};

/** "just now" / "3m ago" / "2h ago" / "4 days ago" — feed-cursor age. */
export function feedAge(lastEventAt: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - lastEventAt.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function composeStatus(dbProbe: DbProbe, feed: FeedProbe, now: Date): StatusSummary {
  const dbSignal: StatusSignal = dbProbe.ok
    ? {
        name: "Database · Neon Postgres",
        state: "operational",
        note: "select 1 round-trip",
        value: `${dbProbe.latencyMs} ms`,
      }
    : {
        name: "Database · Neon Postgres",
        state: "unreachable",
        note: "the probe query failed",
        value: "—",
      };

  const feedSignal: StatusSignal = feed.ok
    ? {
        name: "Live feed",
        state: "operational",
        note: "the cursor every open page streams from",
        value: feed.lastEventAt ? `last event ${feedAge(feed.lastEventAt, now)}` : "no events yet",
      }
    : {
        name: "Live feed",
        state: "unreachable",
        note: "the cursor query failed",
        value: "—",
      };

  const signals: StatusSignal[] = [
    {
      name: "Atlas app",
      state: "operational",
      note: "served this page",
      value: "this render",
    },
    dbSignal,
    feedSignal,
  ];

  const allGreen = dbProbe.ok && feed.ok;
  const sentence = allGreen
    ? `Everything answered: this page rendered, the database replied in ${
        (dbProbe as { latencyMs: number }).latencyMs
      } ms, and the live feed’s newest event is ${
        feed.lastEventAt ? feedAge(feed.lastEventAt, now) : "still to come — no events yet"
      }.`
    : "This page rendered, but the database probe failed — live surfaces will be stale until it answers again.";

  return { word: allGreen ? "up" : "partly up", allGreen, sentence, signals };
}
