/**
 * Phase 2 — Probable-Issues Watcher integration test (real Neon, self-cleaning).
 *
 * Exercises the stuck path end-to-end: a running run older than STUCK_MINUTES
 * with no stdout is flagged with one `advisory` feed row, and a second scan is
 * deduped (no re-nag). All rows carry the WATCHER_TEST marker and are removed
 * afterward, so it never touches real or seeded data.
 */
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/src/db/client";
import { feedEvents, projects, runs } from "@/src/db/schema";
import { runWatcherScan } from "@/src/domain/watcher/scan";

const MARK = "WATCHER_TEST run";
const PROJ = "WATCHER_TEST project";

async function cleanup() {
  const rs = await db.select({ id: runs.id }).from(runs).where(eq(runs.title, MARK));
  for (const r of rs) {
    await db.delete(feedEvents).where(eq(feedEvents.runId, r.id));
  }
  await db.delete(runs).where(eq(runs.title, MARK));
  await db.delete(projects).where(eq(projects.name, PROJ));
}

async function advisoryCount(runId: string): Promise<number> {
  const rows = await db
    .select({ id: feedEvents.id })
    .from(feedEvents)
    .where(and(eq(feedEvents.kind, "advisory"), eq(feedEvents.runId, runId)));
  return rows.length;
}

describe("Probable-Issues Watcher — stuck run", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("emits one advisory for a stuck run and dedupes the next scan", async () => {
    const slug = "watcher-test-" + Math.floor(Date.now() / 1000);
    const [proj] = await db.insert(projects).values({ name: PROJ, slug }).returning();
    const [run] = await db
      .insert(runs)
      .values({ ref: "R-WTEST", projectId: proj.id, title: MARK, state: "running", lane: "owner" })
      .returning();
    // stuck = running + entered-state > STUCK_MINUTES ago + no stdout.
    const old = new Date(Date.now() - 10 * 60 * 1000);
    await db.update(runs).set({ updatedAt: old }).where(eq(runs.id, run.id));

    const first = await runWatcherScan(new Date());
    expect(first.emitted).toBeGreaterThanOrEqual(1);
    expect(await advisoryCount(run.id)).toBe(1);

    const adv = await db
      .select({ summary: feedEvents.summary, actor: feedEvents.actor })
      .from(feedEvents)
      .where(and(eq(feedEvents.kind, "advisory"), eq(feedEvents.runId, run.id)));
    expect(adv[0].actor).toBe("Atlas");
    expect(adv[0].summary).toContain("R-WTEST");

    // second scan within the dedup window → no new advisory for this run.
    await runWatcherScan(new Date());
    expect(await advisoryCount(run.id)).toBe(1);
  }, 30_000);
});
