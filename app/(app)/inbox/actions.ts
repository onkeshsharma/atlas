"use server";
/**
 * M6 — inbox actions. proxy.ts guards GET/HEAD only (M5 SDK quirk), so
 * the action re-guards through the domain helpers itself.
 *
 * M13 — role-routed: the Owner keeps M6's instance-level mark (one
 * Owner, one inbox); Collaborators move their OWN high-water mark
 * (per-user read state — charter item 1). Before M13 a Collaborator
 * invoking this action would have flipped the Owner's read state.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/src/domain/auth/guard";
import { markAllReadFor } from "@/src/domain/collab/read-marks";
import { markAllRead } from "@/src/domain/feed/queries";
import { latestCursor } from "@/src/domain/live/broker";

/** Z:165 "mark all read" — the glyph is `→` per canon §3.6 (stays in Atlas). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");
  if (user.role === "collaborator") {
    await markAllReadFor(user.id, await latestCursor());
  } else {
    await markAllRead();
  }
  revalidatePath("/inbox");
  revalidatePath("/today");
}
