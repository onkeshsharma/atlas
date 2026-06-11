"use server";
/**
 * M6 — inbox actions. proxy.ts guards GET/HEAD only (M5 SDK quirk), so
 * the action re-guards through the domain helpers itself.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/src/domain/auth/guard";
import { markAllRead } from "@/src/domain/feed/queries";

/** Z:165 "mark all read" — the glyph is `→` per canon §3.6 (stays in Atlas). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  if (!user.role) redirect("/no-access");
  await markAllRead();
  revalidatePath("/inbox");
  revalidatePath("/today");
}
