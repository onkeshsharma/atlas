/**
 * M6 — sidebar preference (canon §2.1: expanded state persisted per
 * user in user_preferences.sidebar_collapsed; collapsed is the default).
 */
import { eq, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { userPreferences } from "@/src/db/schema";

export async function sidebarCollapsed(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ collapsed: userPreferences.sidebarCollapsed })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  return row?.collapsed ?? true;
}

/** idempotent upsert — neon-http friendly (single statement). */
export async function setSidebarCollapsed(userId: string, collapsed: boolean): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, sidebarCollapsed: collapsed })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { sidebarCollapsed: collapsed, updatedAt: sql`now()` },
    });
}
