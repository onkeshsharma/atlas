"use server";
/**
 * M10 — Preferences actions (/settings, H). proxy.ts guards GET/HEAD
 * only (M5 SDK quirk) — every action re-guards via the domain helpers.
 * Changes save as they happen (H:242 "Atlas saves as you go").
 */
import { revalidatePath } from "next/cache";

import { requireOwner, requireUser } from "@/src/domain/auth/guard";
import { setSidebarCollapsed } from "@/src/domain/preferences/sidebar";
import { setProjectPinned } from "@/src/domain/project/pin";
import {
  AFK_LEVELS,
  ATHENA_LOCATIONS,
  setAfkFallbackMinutes,
  setAfkLevel,
  setAthenaApiKey,
  setAthenaCouncilSize,
  setAthenaLocation,
  type AfkLevel,
  type AthenaLocation,
} from "@/src/domain/settings/instance";

/** §2.1 — the persisted shell-density preference (expanded ⇄ collapsed). */
export async function setSidebarPrefAction(value: string): Promise<void> {
  const user = await requireUser();
  await setSidebarCollapsed(user.id, value === "collapsed");
  revalidatePath("/", "layout");
}

/** ADR-0007 §4 — AFK dial: off | on | ultra. */
export async function setAfkLevelAction(value: string): Promise<void> {
  await requireOwner();
  if (!(AFK_LEVELS as readonly string[]).includes(value)) return;
  await setAfkLevel(value as AfkLevel);
  revalidatePath("/", "layout"); // the shell chip reflects the level everywhere
}

/** ADR-0007 §4 — how long an unanswered Ask waits before Athena's fallback (AFK off). */
export async function setAfkDelayAction(value: string): Promise<void> {
  await requireOwner();
  const minutes = Number.parseInt(value, 10);
  if (Number.isNaN(minutes)) return;
  await setAfkFallbackMinutes(minutes);
  revalidatePath("/settings");
}

/** ADR-0007 §2 — where Athena consults run: cloud | bridge. */
export async function setAthenaLocationAction(value: string): Promise<void> {
  await requireOwner();
  if (!(ATHENA_LOCATIONS as readonly string[]).includes(value)) return;
  await setAthenaLocation(value as AthenaLocation);
  revalidatePath("/settings");
}

/** ADR-0007 §5 — the Council size (lens-diverse delegates; clamped odd 1–7). */
export async function setAthenaCouncilSizeAction(value: string): Promise<void> {
  await requireOwner();
  const size = Number.parseInt(value, 10);
  if (Number.isNaN(size)) return;
  await setAthenaCouncilSize(size);
  revalidatePath("/settings");
}

/** ADR-0007 §3 — set the cloud-tier Anthropic key (stored encrypted at rest). */
export async function setAthenaKeyAction(formData: FormData): Promise<void> {
  await requireOwner();
  await setAthenaApiKey(String(formData.get("key") ?? "") || null);
  revalidatePath("/settings");
}

/** clear the in-app key (fall back to the env var). */
export async function clearAthenaKeyAction(): Promise<void> {
  await requireOwner();
  await setAthenaApiKey(null);
  revalidatePath("/settings");
}

export async function pinProjectAction(formData: FormData): Promise<void> {
  await requireOwner();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  await setProjectPinned({ projectId, pinned: true, actor: "you" });
  revalidatePath("/settings");
}

export async function unpinProjectAction(formData: FormData): Promise<void> {
  await requireOwner();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  await setProjectPinned({ projectId, pinned: false, actor: "you" });
  revalidatePath("/settings");
}
