"use server";
/**
 * M10 — Bridges page actions (N; PRD #33–#34 + #8). Every action
 * re-guards (proxy.ts covers GET/HEAD only). Writers are the
 * single-statement domain functions — THE OUTBOX RULE lives there.
 */
import { revalidatePath } from "next/cache";

import { requireOwner } from "@/src/domain/auth/guard";
import { requestBridgeDoctor } from "@/src/domain/bridge/doctor";
import { pairBridge, revokeBridge, validateBridgeName } from "@/src/domain/bridge/pairing";
import { bridgeViews } from "@/src/domain/bridge/queries";
import { setRunCap } from "@/src/domain/settings/instance";

export type PairState = {
  /** the show-once secret — rendered ONCE by the amber panel, never stored. */
  token?: string;
  name?: string;
  rotated?: boolean;
  fieldError?: string;
};

export async function pairBridgeAction(
  _prev: PairState,
  formData: FormData,
): Promise<PairState> {
  await requireOwner();
  const raw = String(formData.get("name") ?? "");
  const valid = validateBridgeName(raw);
  if (!valid.ok) return { fieldError: valid.message };
  const result = await pairBridge({ name: valid.name, actor: "you" });
  revalidatePath("/settings/bridges");
  return { token: result.token, name: valid.name, rotated: result.rotated };
}

export async function revokeBridgeAction(formData: FormData): Promise<void> {
  await requireOwner();
  const bridgeId = String(formData.get("bridgeId") ?? "");
  if (!bridgeId) return;
  await revokeBridge({ bridgeId, actor: "you" });
  revalidatePath("/settings/bridges");
}

export async function runDoctorAction(formData: FormData): Promise<void> {
  await requireOwner();
  const bridgeId = String(formData.get("bridgeId") ?? "");
  if (!bridgeId) return;
  await requestBridgeDoctor({ bridgeId, actor: "you" });
  revalidatePath("/settings/bridges");
}

/** N:377 "Run doctor on all" — one request per HEALTHY bridge (honest:
 * an offline daemon can't run checks; its button is disabled too). */
export async function runDoctorAllAction(): Promise<void> {
  await requireOwner();
  const views = await bridgeViews();
  for (const bridge of views) {
    if (bridge.health === "healthy") {
      await requestBridgeDoctor({ bridgeId: bridge.id, actor: "you" });
    }
  }
  revalidatePath("/settings/bridges");
}

/** PRD #8 — the Owner's machine-load dial; propagates on the next
 * heartbeat (≤30 s) per ADR-0002 §3. */
export async function setRunCapAction(value: number): Promise<void> {
  await requireOwner();
  await setRunCap(value);
  revalidatePath("/settings/bridges");
}
