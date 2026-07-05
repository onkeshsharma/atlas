/**
 * Phase 2 — the Probable-Issues Watcher's scheduled pass.
 *
 * Authed by CRON_SECRET (the Vercel cron convention — Vercel injects
 * `Authorization: Bearer <CRON_SECRET>` into cron requests when the env var is
 * set; vercel.json schedules this every 15 min). Runs runHealth over the active
 * runs and pushes a deduped `advisory` feed row for anything runaway/stuck.
 *
 * Without CRON_SECRET the route 503s (the honest not-configured mode) — the
 * same contract as /api/notifier/cron.
 */
import { runWatcherScan } from "@/src/domain/watcher/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET not configured", { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const result = await runWatcherScan(new Date());
  return Response.json({ ok: true, ...result });
}
