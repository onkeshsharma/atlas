/**
 * M13 — the Notifier's scheduled pass (ADR-0003): catch-up ship
 * composition, weekly digests, and delivery of due rows. Authed by
 * CRON_SECRET (the Vercel cron convention — `Authorization: Bearer
 * <CRON_SECRET>`; vercel.json schedules it hourly). `?force=digest`
 * composes the trailing-7-days digest immediately — the acceptance /
 * "send now" affordance (forced period keys stay idempotent).
 *
 * Without RESEND_API_KEY the pass still composes — rows land in the
 * outbox as `composed` and nothing sends (the honest no-key mode).
 */
import { processNotifier } from "@/src/domain/notifier/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET not configured", { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const forceDigest = url.searchParams.get("force") === "digest";
  const result = await processNotifier(new Date(), { forceDigest });
  return Response.json({ ok: true, ...result });
}
