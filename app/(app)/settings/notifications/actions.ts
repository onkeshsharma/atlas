"use server";
/**
 * M10 — Notification preference actions (CC; PRD #48's storage half).
 * Controls save as they change (H:242). Validation lives in the domain;
 * §2.13 error messages surface through the quiet-hours form state.
 */
import { revalidatePath } from "next/cache";

import { requireUser } from "@/src/domain/auth/guard";
import {
  isValidQuietTime,
  patchNotificationPrefs,
  type EmailFormat,
  type Frequency,
} from "@/src/domain/notifications/preferences";

export async function setEmailChannelAction(on: boolean): Promise<void> {
  const user = await requireUser();
  await patchNotificationPrefs(user.id, { emailEnabled: on });
  revalidatePath("/settings/notifications");
}

export async function setFrequencyAction(frequency: Frequency): Promise<void> {
  const user = await requireUser();
  await patchNotificationPrefs(user.id, { frequency });
  revalidatePath("/settings/notifications");
}

export async function setEventAction(key: string, on: boolean): Promise<void> {
  const user = await requireUser();
  await patchNotificationPrefs(user.id, { event: { key, on } });
  revalidatePath("/settings/notifications");
}

export async function setEmailFormatAction(format: EmailFormat): Promise<void> {
  const user = await requireUser();
  await patchNotificationPrefs(user.id, { emailFormat: format });
  revalidatePath("/settings/notifications");
}

export type QuietHoursState = { saved?: boolean; fieldError?: string };

export async function saveQuietHoursAction(
  _prev: QuietHoursState,
  formData: FormData,
): Promise<QuietHoursState> {
  const user = await requireUser();
  const from = String(formData.get("quietFrom") ?? "").trim();
  const until = String(formData.get("quietUntil") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || null;
  // both empty = clear the window (honest off state)
  if (from === "" && until === "") {
    await patchNotificationPrefs(user.id, { quietFrom: null, quietUntil: null, timezone });
    revalidatePath("/settings/notifications");
    return { saved: true };
  }
  if (!isValidQuietTime(from) || !isValidQuietTime(until)) {
    return { fieldError: "times are 24-hour HH:MM" };
  }
  const result = await patchNotificationPrefs(user.id, {
    quietFrom: from,
    quietUntil: until,
    timezone,
  });
  if (!result.ok) return { fieldError: result.message };
  revalidatePath("/settings/notifications");
  return { saved: true };
}
