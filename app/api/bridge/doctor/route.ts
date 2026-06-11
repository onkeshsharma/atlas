/**
 * M10 — the doctor verdict uplink (PRD #34; ADR-0002 §3's idiom: a
 * plain token-authed POST into a single-statement writer). The daemon
 * posts its BridgeDoctorResult; the writer lands it on the bridge row,
 * clears the pending marker, and appends the `doctor-completed` outbox
 * row — every open Bridges page re-renders live (ADR-0001 seam).
 */
import { bridgeFromRequest } from "@/src/domain/bridge/auth";
import { applyDoctorResult, parseBridgeDoctorResult } from "@/src/domain/bridge/doctor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bridge = await bridgeFromRequest(req);
  if (!bridge) return new Response("Unauthorized", { status: 401 });

  const result = parseBridgeDoctorResult(await req.json().catch(() => null));
  if (!result) return new Response("Bad doctor body", { status: 400 });

  const applied = await applyDoctorResult({ bridgeId: bridge.id, result });
  if (!applied.ok) return new Response("Not claimed", { status: 409 });
  return Response.json({ ok: true });
}
