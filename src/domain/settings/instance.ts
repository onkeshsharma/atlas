/**
 * M9 — instance settings reads/writes (single row, id = 1).
 *
 * The Run concurrency cap (PRD #8). Zero-config: reads fall back to the
 * default when no row exists; the Owner-facing dial is M10's settings
 * shell (the write path exists now so tests + the dispatcher can set it).
 */
import { sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { instanceSettings } from "@/src/db/schema";

export const DEFAULT_RUN_CAP = 2;

export async function runCap(): Promise<number> {
  const rows = await db.select({ cap: instanceSettings.runCap }).from(instanceSettings);
  return rows[0]?.cap ?? DEFAULT_RUN_CAP;
}

/** upsert the single row (id = 1). */
export async function setRunCap(cap: number): Promise<void> {
  const value = Math.max(1, Math.floor(cap));
  await db.execute(sql`
    insert into instance_settings (id, run_cap, updated_at)
    values (1, ${value}, now())
    on conflict (id) do update set run_cap = ${value}, updated_at = now()
  `);
}

/**
 * AFK Mode (ADR-0006 §4). When on, a Run's Ask is auto-answered by Athena.
 * Zero-config: defaults to false when no row exists.
 */
export async function afkMode(): Promise<boolean> {
  const rows = await db.select({ afk: instanceSettings.afkMode }).from(instanceSettings);
  return rows[0]?.afk ?? false;
}

/** upsert the single row (id = 1). */
export async function setAfkMode(on: boolean): Promise<void> {
  await db.execute(sql`
    insert into instance_settings (id, afk_mode, updated_at)
    values (1, ${on}, now())
    on conflict (id) do update set afk_mode = ${on}, updated_at = now()
  `);
}
