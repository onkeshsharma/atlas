"use server";
/**
 * M6 — shell actions. proxy.ts guards GET/HEAD only (M5 SDK quirk), so
 * every action re-guards through the domain helpers itself.
 */
import { revalidatePath } from "next/cache";

import { requireUser } from "@/src/domain/auth/guard";
import { setSidebarCollapsed, sidebarCollapsed } from "@/src/domain/preferences/sidebar";

/** §2.1 — flip + persist the expanded-sidebar preference. */
export async function toggleSidebarAction(): Promise<void> {
  const user = await requireUser();
  const collapsed = await sidebarCollapsed(user.id);
  await setSidebarCollapsed(user.id, !collapsed);
  revalidatePath("/", "layout");
}
