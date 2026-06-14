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
import { setAfkMode } from "@/src/domain/settings/instance";

/** §2.1 — the persisted shell-density preference (expanded ⇄ collapsed). */
export async function setSidebarPrefAction(value: string): Promise<void> {
  const user = await requireUser();
  await setSidebarCollapsed(user.id, value === "collapsed");
  revalidatePath("/", "layout");
}

/** ADR-0006 §4 — AFK Mode: when on, Athena answers Runs' Asks for you. */
export async function setAfkModeAction(value: string): Promise<void> {
  await requireOwner();
  await setAfkMode(value === "on");
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
